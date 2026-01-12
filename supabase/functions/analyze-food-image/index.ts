// @ts-nocheck
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GeminiErrorResult = {
  error: string;
  status: number;
  retryAfterSeconds?: number;
};

async function callGemini(
  base64: string,
  mime: string,
  model: string,
  apiKey: string,
  userContext?: any,
): Promise<any | GeminiErrorResult> {
  // ... (기존 callGemini 로직과 동일) ...
  // (생략: 위 코드와 동일하게 유지하세요)
    const userContextBlock = userContext
      ? `\n\n[사용자 컨텍스트]\n${JSON.stringify(userContext, null, 2)}\n`
      : `\n\n[사용자 컨텍스트]\nnull\n`;

    const prompt = `당신은 한국의 식품 분석 전문가입니다. 이미지를 분석하여 음식/제품을 식별하고 영양 정보를 JSON으로 반환하세요.
  
  **응답 언어: 무조건 한국어(Korean)**

  TARGET SCHEMA:
  {
    "dish": string|null, 
    "brand": string|null,
    "ingredients": string[], 
    "allergens": string[], 
    "estimated_macros": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "sugar_g": number, "sodium_mg": number, "cholesterol_mg": number, "saturated_fat_g": number, "trans_fat_g": number },
    "userAnalysis": {
      "grade": "very_good"|"good"|"neutral"|"bad"|"very_bad",
      "reasons": string[],
      "warnings": string[],
      "alternatives": string[],
      "tips": string[]
    }|null,
    "confidence": number, 
    "notes": string
  }

  🚨 **분석 지침 (매우 중요):**
  1. **식별 (Identify)**: 이미지 속 음식이나 제품의 정확한 이름을 파악하세요. (예: "김치찌개", "신라면", "스타벅스 아메리카노")
  2. **데이터 채우기 (절대 빈칸 금지)**:
     - **1순위 (패키지 OCR)**: 제품 포장지에 영양성분표가 보이면 그 값을 그대로 읽으세요.
     - **2순위 (지식 기반 추정)**: 포장지가 없거나 텍스트가 안 보이면, **당신의 방대한 지식 데이터베이스(인터넷 정보)**를 활용하여 해당 음식의 **표준 영양 성분(1인분 기준)**을 반드시 채워넣으세요.
     - **경고:** 'null', '0', '모름'으로 비워두는 것은 허용되지 않습니다. 정확한 값이 없다면 **가장 유사한 일반적인 레시피나 제품의 평균값**이라도 넣으세요. 사용자는 추정치라도 원합니다.
  3. **알레르기**: 원재료를 분석하여 알레르기 유발 가능성을 판단하세요.
  4. **Notes**: 이 데이터가 포장지에서 읽은 것인지, 아니면 일반적인 정보를 바탕으로 추정한 것인지 명시하세요.
  5. **개인화(userAnalysis)**: 사용자 컨텍스트(체형 목표/식습관/알레르기/신체정보)가 있으면 반드시 반영하여 등급(grade)과 이유/팁/대체식을 작성하세요. 컨텍스트가 없으면 userAnalysis는 null로 두세요.
  6. **출력은 JSON만**: 설명 문장/마크다운/코드펜스 없이 JSON 객체 1개만 출력하세요.
  ${userContextBlock}
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
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  };

  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const retryAfterHeader = res.headers.get('retry-after');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;

    const rawText = await res.text().catch(() => '');
    const json = (() => {
      try {
        return rawText ? JSON.parse(rawText) : {};
      } catch {
        return { error: 'JSON Parse Error', raw: rawText };
      }
    })();

    if (res.ok && !json?.error) {
      const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return { error: 'No text generated.', status: res.status };
      }
      return parseJsonBlock(text);
    }

    const isRateLimited = res.status === 429;
    const isRetryable = isRateLimited || res.status === 503;
    const hasMoreAttempts = attempt < maxAttempts - 1;

    if (isRetryable && hasMoreAttempts) {
      const baseDelayMs = 600;
      const expo = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.floor(Math.random() * 250);
      const delayMs = Number.isFinite(retryAfterSeconds)
        ? Math.max(0, (retryAfterSeconds as number) * 1000)
        : expo + jitter;

      await sleep(delayMs);
      continue;
    }

    const errDetail = json?.error ? JSON.stringify(json.error) : rawText || 'Unknown error';
    return {
      error: `Gemini API Error (${res.status}): ${errDetail}`,
      status: res.status,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
    };
  }

  return { error: 'Gemini API Error: exceeded retry attempts.', status: 429 };
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
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash'; 

    let geminiData: any = null;
    let geminiNotice = "";

    // 1. Gemini 호출
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, message: '서버 설정 오류: GEMINI_API_KEY가 없습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userContextRaw = form.get('userContext');
    const userContext = (() => {
      if (!userContextRaw) return null;
      if (typeof userContextRaw !== 'string') return null;
      try {
        return JSON.parse(userContextRaw);
      } catch {
        return null;
      }
    })();

    geminiData = await callGemini(base64, file.type || 'image/jpeg', model, apiKey, userContext);

    if (geminiData?.error) {
      const status = typeof geminiData.status === 'number' ? geminiData.status : 502;
      const is429 = status === 429;

      return new Response(
        JSON.stringify({
          ok: false,
          code: status,
          message: is429
            ? '요청이 많아서 AI 분석이 지연되고 있어요. 잠시 후 다시 시도해주세요. (Gemini 429)'
            : 'AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          retryAfterSeconds: geminiData.retryAfterSeconds,
        }),
        {
          status: is429 ? 429 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 2. DB 검색 및 데이터 교체 로직
    let dbFood: any = null;
    let source = "AI Vision Analysis";
    let referenceStandard = "Per Package/Serving"; 

    if (geminiData && geminiData.dish) {
      const searchTerm = geminiData.dish.split(' ').join(' & ');
      const cleanName = geminiData.dish.replace(/[^\w\s가-힣]/g, '').trim();

      // 2-1. 가공식품 DB (food_nutrition) 검색
      const { data: processedResults } = await supabase
        .from('food_nutrition')
        .select('*')
        .textSearch('name', searchTerm, { config: 'simple', type: 'websearch' })
        .limit(1);

      // 2-2. 일반음식 DB (foot_normal) 검색 - 가공식품에 없을 경우
      let generalResults: any[] = [];
      if (!processedResults || processedResults.length === 0) {
         const { data: normalResults } = await supabase
          .from('foot_normal')
          .select('*')
          .or(`name.ilike.%${cleanName}%,name.textSearch.${cleanName}`)
          .limit(1);
         if (normalResults) generalResults = normalResults;
      }

      if (processedResults && processedResults.length > 0) {
        // [CASE A] 가공식품 DB 발견
        dbFood = processedResults[0];
        source = "Supabase DB (Processed Food)";
        referenceStandard = "100g 기준 (Per 100g)"; 

        geminiData.brand = dbFood.brand || null;
        geminiData.estimated_macros = {
          calories: dbFood.calories,
          protein_g: dbFood.protein,
          carbs_g: dbFood.carbs,
          fat_g: dbFood.fat,
          sugar_g: dbFood.sugar,
          sodium_mg: dbFood.sodium,
          cholesterol_mg: dbFood.cholesterol,
          saturated_fat_g: dbFood.saturated_fat, 
          trans_fat_g: dbFood.trans_fat
        };

        if (dbFood.brand) {
             geminiData.dish = `${dbFood.brand} ${dbFood.name}`;
        } else {
             geminiData.dish = dbFood.name;
        }
        geminiNotice = `[데이터베이스 연동됨] 가공식품 DB에서 정확한 성분표를 가져왔습니다. (100g 기준)`;

      } else if (generalResults && generalResults.length > 0) {
        // [CASE B] 일반음식 DB 발견 (foot_normal)
        dbFood = generalResults[0];
        source = "Supabase DB (General Food)";
        referenceStandard = "100g 기준 (Per 100g)";

        // 일반음식은 브랜드가 보통 없음
        geminiData.brand = null; 
        
        // foot_normal 테이블 컬럼 매핑 (사용자 DB 스키마에 따라 수정 필요할 수 있음, 여기선 food_nutrition과 유사하다고 가정)
        // 만약 컬럼명이 다르다면 여기서 수정해야 합니다. 예: energy -> calories
        geminiData.estimated_macros = {
          calories: dbFood.calories || dbFood.energy, // 컬럼명 대응
          protein_g: dbFood.protein,
          carbs_g: dbFood.carbs || dbFood.carbohydrate,
          fat_g: dbFood.fat,
          sugar_g: dbFood.sugar,
          sodium_mg: dbFood.sodium,
          cholesterol_mg: dbFood.cholesterol,
          saturated_fat_g: dbFood.saturated_fat,
          trans_fat_g: dbFood.trans_fat
        };

        geminiData.dish = dbFood.name;
        geminiNotice = `[데이터베이스 연동됨] 일반음식 DB에서 성분표를 가져왔습니다. (100g 기준)`;

      } else {
        // [CASE C] DB 미발견 -> AI 추정치 사용
        source = "AI Estimation (DB Not Found)";
        referenceStandard = "AI Estimate / Package Label";
        geminiNotice = `[DB 미발견] AI가 패키지를 읽거나 인터넷 지식을 기반으로 추정했습니다.`;
      }
    }

    // 3. 최종 데이터 반환 구성
    // 사용자 알레르기(컨텍스트)가 있으면 warnings에 보정(모델 누락 방지)
    const userAllergens: string[] = Array.isArray((userContext as any)?.allergens)
      ? (userContext as any).allergens.filter((x: any) => typeof x === 'string')
      : [];
    const modelAllergens: string[] = Array.isArray(geminiData?.allergens)
      ? geminiData.allergens.filter((x: any) => typeof x === 'string')
      : [];
    const warningsFromAllergens = userAllergens
      .filter(a => modelAllergens.some((m: string) => m.includes(a) || a.includes(m)))
      .map(a => `알레르기 주의: ${a}`);

    const mergedUserAnalysis = (() => {
      const ua = geminiData?.userAnalysis;
      if (!ua) return null;
      const warnings = Array.isArray(ua.warnings) ? ua.warnings.filter((x: any) => typeof x === 'string') : [];
      return {
        ...ua,
        warnings: Array.from(new Set([...warningsFromAllergens, ...warnings])),
      };
    })();

    const data = {
      kind: 'food',
      version: 'v12-personalized-usercontext',
      model,
      source,
      reference_standard: referenceStandard,
      dish: geminiData?.dish ?? null,
      
      
      // 🚨 [핵심 수정] 여기에 brand 필드를 반드시 포함시켜야 프론트엔드로 나갑니다.
      brand: geminiData?.brand ?? null,

      ingredients: Array.isArray(geminiData?.ingredients) ? geminiData.ingredients : [],
      allergens: Array.isArray(geminiData?.allergens) ? geminiData.allergens : [],
      estimated_macros: geminiData?.estimated_macros || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugar_g: 0, sodium_mg: 0, cholesterol_mg: 0, saturated_fat_g: 0, trans_fat_g: 0 },
      userAnalysis: mergedUserAnalysis,
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