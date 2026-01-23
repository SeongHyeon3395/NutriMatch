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

function safeNumber(x: any): number | null {
  const n = typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN;
  return Number.isFinite(n) ? n : null;
}

function hasMeaningfulUserContext(ctx: any): boolean {
  if (!ctx || typeof ctx !== 'object') return false;
  const keys = Object.keys(ctx);
  if (keys.length === 0) return false;
  return keys.some((k) => {
    const v = (ctx as any)[k];
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return Number.isFinite(v);
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return true;
  });
}

function buildPersonalizedUserAnalysisFallback(params: {
  dish: string | null;
  estimated_macros: any;
  modelAllergens: string[];
  userContext: any;
  warningsFromAllergens: string[];
}) {
  const dish = typeof params.dish === 'string' && params.dish.trim() ? params.dish.trim() : '이 음식';
  const macros = params.estimated_macros || {};

  const calories = safeNumber(macros.calories);
  const protein = safeNumber(macros.protein_g);
  const carbs = safeNumber(macros.carbs_g);
  const fat = safeNumber(macros.fat_g);
  const sugar = safeNumber(macros.sugar_g);
  const sodium = safeNumber(macros.sodium_mg);

  const bodyGoal = params.userContext?.bodyGoal;
  const healthDiet = params.userContext?.healthDiet;

  const pros: string[] = [];
  const cons: string[] = [];
  const goalFit: string[] = [];
  const dietFit: string[] = [];
  const healthImpact: string[] = [];

  // 단순 임계값(대략) 기반 판단: 표준/100g/1인분이 섞일 수 있으니 과도한 단정은 피함
  const isHighCalories = calories !== null ? calories >= 650 : false;
  const isHighProtein = protein !== null ? protein >= 25 : false;
  const isLowProtein = protein !== null ? protein < 12 : false;
  const isHighCarb = carbs !== null ? carbs >= 60 : false;
  const isHighFat = fat !== null ? fat >= 20 : false;
  const isHighSugar = sugar !== null ? sugar >= 15 : false;
  const isHighSodium = sodium !== null ? sodium >= 700 : false;

  // 목표/식단에 따른 장단점
  if (bodyGoal === 'diet') {
    if (isHighCalories) cons.push('칼로리가 높은 편이라 다이어트 목표에는 부담될 수 있어요.');
    else if (calories !== null) pros.push('칼로리가 과하지 않아 다이어트 목표에 비교적 무난해요.');
    if (isHighCalories) goalFit.push('다이어트 목표라면 양/소스를 조절하는 게 좋아요.');
    else goalFit.push('다이어트 목표 기준으로는 무난한 선택일 수 있어요.');
  }
  if (bodyGoal === 'bulking' || bodyGoal === 'lean_bulk') {
    if (isHighProtein) pros.push('단백질이 충분해 근육/벌크업 목표에 도움이 될 수 있어요.');
    else if (isLowProtein) cons.push('단백질이 낮은 편이라 벌크업 목표에는 아쉬울 수 있어요.');
    if (isHighProtein) goalFit.push('벌크업/린벌크 목표에 필요한 단백질 확보에 도움이 될 수 있어요.');
    else goalFit.push('벌크업 목표라면 단백질을 추가(닭/생선/두부/계란)하는 게 좋아요.');
  }
  if (healthDiet === 'high_protein') {
    if (isHighProtein) pros.push('단백질이 높은 편이라 고단백 식단에 잘 맞아요.');
    else if (isLowProtein) cons.push('단백질이 낮아 고단백 식단 목표에는 부족할 수 있어요.');
    dietFit.push(isHighProtein ? '고단백 식단 기준으로 적합해요.' : '고단백 식단 기준으로는 단백질이 부족할 수 있어요.');
  }
  if (healthDiet === 'low_carb') {
    if (isHighCarb) cons.push('탄수화물이 많은 편이라 저탄수 목표에는 아쉬워요.');
    else if (carbs !== null) pros.push('탄수화물이 과하지 않아 저탄수 목표에 비교적 무난해요.');
    dietFit.push(isHighCarb ? '저탄수 식단 관점에서는 탄수 비중을 줄이는 게 좋아요.' : '저탄수 식단 관점에서 비교적 무난해요.');
  }
  if (healthDiet === 'low_sodium') {
    if (isHighSodium) cons.push('나트륨이 높은 편이라 저염 목표에는 주의가 필요해요.');
    else if (sodium !== null) pros.push('나트륨이 과하지 않아 저염 목표에 비교적 무난해요.');
    dietFit.push(isHighSodium ? '저염 식단 관점에서 소스/국물/가공식품 비중을 줄이세요.' : '저염 식단 관점에서 비교적 무난해요.');
  }
  if (healthDiet === 'low_fat') {
    if (isHighFat) cons.push('지방이 많은 편이라 저지방 목표에는 아쉬워요.');
    else if (fat !== null) pros.push('지방이 과하지 않아 저지방 목표에 비교적 무난해요.');
    dietFit.push(isHighFat ? '저지방 식단 관점에서는 조리법/부위를 바꾸는 게 좋아요.' : '저지방 식단 관점에서 비교적 무난해요.');
  }
  if (healthDiet === 'diabetic') {
    if (isHighSugar || isHighCarb) cons.push('당/탄수 비중이 높아 혈당 관리 관점에서 주의가 필요해요.');
    else if (sugar !== null || carbs !== null) pros.push('당/탄수가 과하지 않아 혈당 관리 관점에서 비교적 무난해요.');
    dietFit.push((isHighSugar || isHighCarb) ? '혈당 관리 관점에서 탄수/당 조절이 필요해요.' : '혈당 관리 관점에서 비교적 무난해요.');
  }

  // 건강 관점(대략)
  if (isHighSodium) healthImpact.push('나트륨이 높으면 혈압/부종 관리에 불리할 수 있어요.');
  if (isHighSugar) healthImpact.push('당류가 높으면 혈당/체지방 관리에 불리할 수 있어요.');
  if (isHighFat) healthImpact.push('지방이 높으면 총칼로리가 쉽게 올라갈 수 있어요.');
  if (isHighProtein) healthImpact.push('단백질이 충분하면 포만감/근육 유지에 도움이 될 수 있어요.');

  // 컨텍스트가 애매할 때도 최소 1개씩은 채우기
  if (pros.length === 0) {
    if (isHighProtein) pros.push('단백질이 비교적 충분한 편이에요.');
    else if (calories !== null && calories < 500) pros.push('칼로리가 아주 높지 않은 편이에요.');
    else pros.push('사진 기준으로 음식 구성을 추정했어요.');
  }
  if (cons.length === 0) {
    if (isHighSodium) cons.push('나트륨이 높은 편일 수 있어요.');
    else if (isHighCalories) cons.push('칼로리가 높은 편일 수 있어요.');
    else if (isHighSugar) cons.push('당류가 높은 편일 수 있어요.');
    else cons.push('정확한 성분표가 아니면 오차가 있을 수 있어요.');
  }

  // 등급 산정(간단)
  const conCount = cons.length;
  const proCount = pros.length;
  let grade: any = 'neutral';
  if (conCount >= 3) grade = 'very_bad';
  else if (conCount >= 2) grade = 'bad';
  else if (conCount === 0 && proCount >= 2) grade = 'very_good';
  else if (conCount === 0 && proCount >= 1) grade = 'good';

  // 0~100 점수(간단): grade 기반 + 컨텍스트/경고 기반 미세 조정
  let score100 = (() => {
    switch (grade) {
      case 'very_good':
        return 90;
      case 'good':
        return 75;
      case 'neutral':
        return 60;
      case 'bad':
        return 40;
      case 'very_bad':
        return 20;
      default:
        return 60;
    }
  })();

  // 사용자 목표/식단에 대한 페널티/보너스 (과도한 단정 방지: +/- 5~15 범위)
  if (bodyGoal === 'diet' && isHighCalories) score100 -= 10;
  if ((bodyGoal === 'bulking' || bodyGoal === 'lean_bulk') && isLowProtein) score100 -= 8;
  if ((bodyGoal === 'bulking' || bodyGoal === 'lean_bulk') && isHighProtein) score100 += 5;
  if (healthDiet === 'high_protein' && isHighProtein) score100 += 5;
  if (healthDiet === 'low_sodium' && isHighSodium) score100 -= 12;
  if (healthDiet === 'low_carb' && isHighCarb) score100 -= 10;
  if (healthDiet === 'low_fat' && isHighFat) score100 -= 10;
  if (healthDiet === 'diabetic' && (isHighSugar || isHighCarb)) score100 -= 12;

  const allergenWarningsCount = Array.isArray(params.warningsFromAllergens) ? params.warningsFromAllergens.length : 0;
  if (allergenWarningsCount > 0) score100 -= Math.min(20, 10 + allergenWarningsCount * 3);

  score100 = Math.max(0, Math.min(100, Math.round(score100)));

  const atAGlance = `${dish}로 추정했고, 영양정보는 사진/일반정보를 바탕으로 한 추정치예요. (좋은 점) ${pros[0]} (아쉬운 점) ${cons[0]}`;

  const alternatives: string[] = [];
  if (healthDiet === 'low_sodium' || isHighSodium) {
    alternatives.push('국물/소스는 줄이고, 구이/찜처럼 덜 짠 메뉴로 바꿔보세요.');
  }
  if (healthDiet === 'low_carb' || isHighCarb) {
    alternatives.push('밥/면은 절반으로 줄이고 단백질+채소를 늘려보세요.');
  }
  if (healthDiet === 'diabetic' || isHighSugar) {
    alternatives.push('당이 적은 옵션(무가당/소스 적게)으로 바꿔보세요.');
  }
  if (alternatives.length === 0) {
    alternatives.push('단백질(닭/생선/두부)과 채소를 곁들이면 균형이 좋아져요.');
  }

  const tips: string[] = [atAGlance];
  if (isHighSodium) tips.push('가능하면 국물은 남기고, 물을 충분히 드세요.');
  if (isHighCarb) tips.push('후식/음료의 당 섭취는 줄이는 게 좋아요.');
  if (isLowProtein) tips.push('단백질 반찬을 추가하면 더 좋아요.');

  return {
    grade,
    score100,
    pros,
    cons,
    goalFit,
    dietFit,
    healthImpact,
    reasons: [pros[0], cons[0]],
    warnings: Array.from(new Set([...(params.warningsFromAllergens || [])])),
    alternatives,
    tips,
  };
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

    const prompt = `당신은 한국의 식품/영양 분석 전문가입니다. 이미지를 분석하여 음식/제품을 식별하고 영양 정보를 JSON으로 반환하세요.
  
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
      "score100": number,
      "pros": string[],
      "cons": string[],
      "goalFit": string[],
      "dietFit": string[],
      "healthImpact": string[],
      "reasons": string[],
      "warnings": string[],
      "alternatives": string[],
      "tips": string[]
    }|null,
    "confidence": number, 
    "notes": string
  }

    🚨 **분석 지침 (매우 중요):**
    1. **식별 (Identify)**: 이미지 속 음식/제품의 가장 그럴듯한 이름을 정하세요. (예: "김치찌개", "신라면", "스타벅스 아메리카노")
    2. **데이터 채우기 (가능한 한 구체적으로) - 절대 비워두지 마세요!**:
      - **1순위 (패키지 OCR)**: 포장지의 영양성분표가 보이면 그 값을 그대로 반영하세요.
      - **2순위 (일반 지식 기반 추정)**: 포장지 텍스트가 없거나 불명확하면, 해당 음식의 **표준 1인분 기준**으로 가장 합리적인 추정치를 채우세요.
      - **🔥 매크로는 절대 0이나 null로 두지 마세요!** 정확한 값을 모르면 유사 음식(예: 같은 카테고리의 평균)이나 일반 상식 기반으로 합리적인 추정치를 반드시 채우세요.
      - 예: 김치찌개 1인분 → 칼로리 ~350-450kcal, 단백질 ~20g, 탄수화물 ~30g, 지방 ~15g 정도로 추정
    3. **알레르기/성분**: 원재료를 추정하여 알레르기 유발 가능성을 판단하세요.
    4. **Notes**: 영양값이 (a) 포장지 OCR 기반인지, (b) 일반 지식 기반 추정인지, (c) 혼합인지 반드시 명시하세요.
    5. **개인화(userAnalysis)**:
      - 사용자 컨텍스트가 있으면 반드시 반영하여 grade/reasons/warnings/alternatives/tips를 작성하세요.
      - 컨텍스트가 없으면 userAnalysis는 null로 두세요.
      - **score100(0~100)**: 사용자 컨텍스트를 반영한 “식단 점수”를 0~100 정수로 작성하세요. (0=매우 부적합, 100=매우 적합)
      - pros/cons/goalFit/dietFit/healthImpact는 각각 최소 2개 이상 채우세요. (짧고 명확하게)
      - 특히 **tips[0]는 앱의 “한눈에 보기”에 그대로 노출됩니다.** 아래 형식을 강제합니다:
       - 2~3문장, 한국어, 짧고 직관적
       - 반드시 포함: (1) 음식 이름을 ~로 추정했다는 말, (2) 영양정보가 사진/일반정보 기반 “추정치”라는 고지, (3) 사용자 컨텍스트를 반영한 **좋은 점 1개 + 아쉬운 점 1개**
       - 예: "이 음식은 ‘OOO’로 추정했고, 영양정보는 사진/일반정보를 바탕으로 한 추정치예요. (좋은 점) … (아쉬운 점) …"
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

    // 3. 매크로 최종 보정 (Gemini/DB 모두 실패 시 카테고리 기반 폴백)
    if (geminiData && geminiData.estimated_macros) {
      const macros = geminiData.estimated_macros;
      const hasMacros = (macros.calories > 0 || macros.protein_g > 0 || macros.carbs_g > 0 || macros.fat_g > 0);
      
      if (!hasMacros) {
        // 음식 카테고리 추정 (간단한 키워드 기반)
        const dishName = (geminiData.dish || '').toLowerCase();
        let defaultMacros = { calories: 300, protein_g: 15, carbs_g: 40, fat_g: 10, sugar_g: 5, sodium_mg: 600, cholesterol_mg: 30, saturated_fat_g: 3, trans_fat_g: 0 };
        
        if (dishName.includes('밥') || dishName.includes('덮밥') || dishName.includes('비빔밥')) {
          defaultMacros = { calories: 550, protein_g: 18, carbs_g: 85, fat_g: 12, sugar_g: 8, sodium_mg: 800, cholesterol_mg: 40, saturated_fat_g: 4, trans_fat_g: 0 };
        } else if (dishName.includes('라면') || dishName.includes('면')) {
          defaultMacros = { calories: 500, protein_g: 12, carbs_g: 75, fat_g: 15, sugar_g: 5, sodium_mg: 2000, cholesterol_mg: 20, saturated_fat_g: 7, trans_fat_g: 0 };
        } else if (dishName.includes('찌개') || dishName.includes('국') || dishName.includes('탕')) {
          defaultMacros = { calories: 400, protein_g: 22, carbs_g: 30, fat_g: 18, sugar_g: 6, sodium_mg: 1200, cholesterol_mg: 50, saturated_fat_g: 6, trans_fat_g: 0 };
        } else if (dishName.includes('치킨') || dishName.includes('닭')) {
          defaultMacros = { calories: 700, protein_g: 45, carbs_g: 35, fat_g: 38, sugar_g: 8, sodium_mg: 1400, cholesterol_mg: 120, saturated_fat_g: 10, trans_fat_g: 0 };
        } else if (dishName.includes('샐러드')) {
          defaultMacros = { calories: 200, protein_g: 8, carbs_g: 20, fat_g: 8, sugar_g: 10, sodium_mg: 400, cholesterol_mg: 15, saturated_fat_g: 2, trans_fat_g: 0 };
        } else if (dishName.includes('피자') || dishName.includes('버거') || dishName.includes('햄버거')) {
          defaultMacros = { calories: 650, protein_g: 25, carbs_g: 60, fat_g: 32, sugar_g: 12, sodium_mg: 1300, cholesterol_mg: 70, saturated_fat_g: 12, trans_fat_g: 0.5 };
        } else if (dishName.includes('빵') || dishName.includes('케이크') || dishName.includes('도넛')) {
          defaultMacros = { calories: 350, protein_g: 6, carbs_g: 50, fat_g: 14, sugar_g: 20, sodium_mg: 300, cholesterol_mg: 25, saturated_fat_g: 7, trans_fat_g: 0 };
        }
        
        geminiData.estimated_macros = defaultMacros;
        geminiNotice += ' [서버 폴백: 매크로를 카테고리별 평균치로 추정했어요.]';
      }
    }

    // 4. 최종 데이터 반환 구성
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
      const hasCtx = hasMeaningfulUserContext(userContext);

      // 1) 모델이 userAnalysis를 아예 안 준 경우: 컨텍스트가 있으면 서버에서 폴백 생성
      if (!ua) {
        if (!hasCtx) return null;
        return buildPersonalizedUserAnalysisFallback({
          dish: geminiData?.dish ?? null,
          estimated_macros: geminiData?.estimated_macros,
          modelAllergens,
          userContext,
          warningsFromAllergens,
        });
      }

      // 2) 모델이 줬지만 내용이 빈 경우: tips[0]/reasons를 보정
      const next: any = { ...ua };
      const warnings = Array.isArray(next.warnings) ? next.warnings.filter((x: any) => typeof x === 'string') : [];
      next.warnings = Array.from(new Set([...warningsFromAllergens, ...warnings]));

      if (hasCtx) {
        const fallback = buildPersonalizedUserAnalysisFallback({
          dish: geminiData?.dish ?? null,
          estimated_macros: geminiData?.estimated_macros,
          modelAllergens,
          userContext,
          warningsFromAllergens,
        });

        // score100이 없으면 서버 폴백 값으로 보정
        const rawScore = (next as any)?.score100;
        const scoreNumeric = typeof rawScore === 'number' ? rawScore : typeof rawScore === 'string' ? Number(rawScore) : NaN;
        if (!Number.isFinite(scoreNumeric)) {
          (next as any).score100 = fallback.score100;
        }

        const tips = Array.isArray(next.tips) ? next.tips.filter((x: any) => typeof x === 'string' && x.trim()) : [];
        if (tips.length === 0) {
          next.tips = fallback.tips;
        } else {
          // 한눈에 보기(tips[0])는 사용자 맞춤 요약으로 강제(기존 팁은 뒤로 유지)
          next.tips = [fallback.tips[0], ...tips.slice(0, 5)];
        }

        const reasons = Array.isArray(next.reasons) ? next.reasons.filter((x: any) => typeof x === 'string' && x.trim()) : [];
        if (reasons.length === 0) next.reasons = fallback.reasons;

        const alternatives = Array.isArray(next.alternatives) ? next.alternatives.filter((x: any) => typeof x === 'string' && x.trim()) : [];
        if (alternatives.length === 0) next.alternatives = fallback.alternatives;

        const pros = Array.isArray((next as any).pros) ? (next as any).pros.filter((x: any) => typeof x === 'string' && x.trim()) : [];
        if (pros.length === 0) (next as any).pros = fallback.pros;

        const cons = Array.isArray((next as any).cons) ? (next as any).cons.filter((x: any) => typeof x === 'string' && x.trim()) : [];
        if (cons.length === 0) (next as any).cons = fallback.cons;

        const goalFit = Array.isArray((next as any).goalFit) ? (next as any).goalFit.filter((x: any) => typeof x === 'string' && x.trim()) : [];
        if (goalFit.length === 0) (next as any).goalFit = fallback.goalFit;

        const dietFit = Array.isArray((next as any).dietFit) ? (next as any).dietFit.filter((x: any) => typeof x === 'string' && x.trim()) : [];
        if (dietFit.length === 0) (next as any).dietFit = fallback.dietFit;

        const healthImpact = Array.isArray((next as any).healthImpact) ? (next as any).healthImpact.filter((x: any) => typeof x === 'string' && x.trim()) : [];
        if (healthImpact.length === 0) (next as any).healthImpact = fallback.healthImpact;
      }

      return next;
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