import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ... (MacroBlock, parseJsonBlock, callGemini 함수는 기존과 동일하므로 생략 가능하지만 전체 흐름을 위해 유지) ...

function parseJsonBlock(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { raw: text };
  try { return JSON.parse(match[0]); } catch { return { raw: text }; }
}

async function callGemini(base64: string, mime: string, model: string, apiKey: string): Promise<any> {
  // ... (기존 callGemini 로직과 동일) ...
  // (생략: 위 코드와 동일하게 유지하세요)
    const prompt = `당신은 한국의 식품 분석 전문가입니다. OCR을 사용하여 이미지를 분석하고 JSON으로 반환하세요.
  
  **응답 언어: 무조건 한국어(Korean)**

  TARGET SCHEMA:
  {
    "dish": string|null, 
    "brand": string|null,
    "ingredients": string[], 
    "allergens": string[], 
    "estimated_macros": { "calories": number|null, "protein_g": number|null, "carbs_g": number|null, "fat_g": number|null },
    "confidence": number, 
    "notes": string
  }

  🚨 **분석 지침:**
  1. **정확한 제품명 파악 (최우선)**: 포장지의 텍스트를 읽어 **브랜드명 + 제품명**을 정확히 조합하세요. (예: "연세우유 초코생크림빵"). 이것이 DB 검색의 키가 됩니다.
  2. **영양성분**: 일단 포장지에 적힌 영양정보나 당신의 지식을 이용해 채우세요.
  3. **알레르기**: 포장지를 읽거나 원재료를 분석해 알레르기 정보를 채우세요.
  `;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const body = {
    contents: [{ parts: [ { text: prompt }, { inline_data: { mime_type: mime || 'image/jpeg', data: base64 } } ] }],
    safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ],
    generationConfig: { temperature: 0.1 },
  };

  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({ error: "JSON Parse Error" }));

  if (!res.ok || json.error) {
    return { error: `Gemini API Error (${res.status}): ${JSON.stringify(json.error)}` };
  }

  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { error: "No text generated." };
  
  return parseJsonBlock(text);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') throw new Error('POST only');
    const form = await req.formData().catch(() => null);
    if (!form) throw new Error('Invalid form');
    const file = form.get('file') as File | null;
    if (!file) throw new Error('File required');

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = encodeBase64(bytes);
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash'; 

    let geminiData: any = null;
    let geminiNotice = "";

    // 1. Gemini 호출
    if (apiKey) {
      geminiData = await callGemini(base64, file.type || 'image/jpeg', model, apiKey);
    } else {
      geminiNotice = "API Key is missing";
    }

    if (geminiData?.error) geminiNotice = geminiData.error;

    // 2. DB 검색 및 데이터 교체 로직
    let dbFood: any = null;
    let source = "AI Vision Analysis";
    let referenceStandard = "Per Package/Serving"; 

    if (geminiData && geminiData.dish) {
      const searchTerm = geminiData.dish.split(' ').join(' & ');

      const { data: searchResults, error } = await supabase
        .from('food_nutrition')
        .select('*')
        .textSearch('name', searchTerm, { config: 'simple', type: 'websearch' })
        .limit(1);

      if (searchResults && searchResults.length > 0) {
        dbFood = searchResults[0];
        source = "Supabase DB (Verified Data)";
        referenceStandard = "100g 기준 (Per 100g)"; 

        // 🚨 [중요] DB 값을 기반으로 브랜드 설정 (가공식품은 있고, 원물은 null이 되도록)
        // DB에 brand 컬럼 값이 있으면 그 값을 쓰고, 없으면 null로 덮어씁니다.
        geminiData.brand = dbFood.brand || null;

        // 🚨 [중요] AI가 가져온 수치를 DB 값으로 강제 교체
        geminiData.estimated_macros = {
          calories: dbFood.calories,
          protein_g: dbFood.protein,
          carbs_g: dbFood.carbs,
          fat_g: dbFood.fat,
          sugar_g: dbFood.sugar,              // DB 컬럼명이 sugar인지 확인 필요
          sodium_mg: dbFood.sodium,           // DB 컬럼명이 sodium인지 확인 필요
          cholesterol_mg: dbFood.cholesterol, // DB 컬럼명이 cholesterol인지 확인 필요
          saturated_fat_g: dbFood.saturated_fat, 
          trans_fat_g: dbFood.trans_fat
        };

        // 이름 업데이트 (브랜드가 있으면 앞에 붙여줌 - 선택사항)
        if (dbFood.brand) {
             geminiData.dish = `${dbFood.brand} ${dbFood.name}`;
        } else {
             geminiData.dish = dbFood.name;
        }

        geminiNotice = `[데이터베이스 연동됨] 정확한 성분표를 가져왔습니다. (주의: 위 영양 정보는 100g당 기준입니다.)`;
      } else {
        source = "AI Estimation (DB Not Found)";
        referenceStandard = "AI Estimate / Package Label";
        geminiNotice = `[DB 미발견] AI가 패키지를 읽거나 추정했습니다. 정확하지 않을 수 있습니다.`;
        
        // DB 미발견 시 AI가 찾은 브랜드 유지. 
        // 원한다면 여기서도 AI가 찾은 브랜드가 너무 불확실하면 null로 만들 수 있지만,
        // AI가 OCR로 읽은 브랜드일 수 있으므로 그대로 둡니다.
      }
    }

    // 3. 최종 데이터 반환 구성
    const data = {
      kind: 'food',
      version: 'v11-brand-fix',
      model,
      source,
      reference_standard: referenceStandard,
      dish: geminiData?.dish ?? null,
      
      // 🚨 [핵심 수정] 여기에 brand 필드를 반드시 포함시켜야 프론트엔드로 나갑니다.
      brand: geminiData?.brand ?? null,

      ingredients: Array.isArray(geminiData?.ingredients) ? geminiData.ingredients : [],
      allergens: Array.isArray(geminiData?.allergens) ? geminiData.allergens : [],
      estimated_macros: geminiData?.estimated_macros || { calories: null, protein_g: null, carbs_g: null, fat_g: null },
      confidence: typeof geminiData?.confidence === 'number' ? geminiData.confidence : 0,
      notes: geminiData?.notes || geminiNotice,
      fileMeta: { name: file.name, size: file.size, type: file.type },
      geminiUsed: Boolean(apiKey),
    };

    return new Response(JSON.stringify({ ok: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});