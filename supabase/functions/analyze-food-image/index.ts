// Supabase Edge Function (Deno)
// Dish / meal photo → structured nutrition + allergen analysis using Gemini 1.5 Pro.
// Set secret: `supabase secrets set GEMINI_API_KEY=...` (DO NOT expose on client)
// Optional override: `supabase secrets set GEMINI_MODEL=gemini-1.5-pro` (defaults to pro already)
// Endpoint: https://<project-ref>.functions.supabase.co/analyze-food-image
// Response shape (data): {
//   kind: 'food', version: 'v4-dish', model, durationMs,
//   dish, ingredients, allergens, estimated_macros, confidence, notes,
//   fileMeta, geminiUsed, rawModel? (debug)
// }
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

type MacroBlock = { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null };
type DishOutput = {
  dish: string | null;
  ingredients: string[];
  allergens: string[];
  estimated_macros: MacroBlock;
  confidence: number;
  notes: string;
};

function parseJsonBlock(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { raw: text };
  try { return JSON.parse(match[0]); } catch { return { raw: text }; }
}

async function callGemini(base64: string, mime: string, model: string, apiKey: string): Promise<DishOutput | { raw?: string } | null> {
  const prompt = `You are an expert nutrition analyst.
Return STRICT JSON ONLY (no commentary) with this schema:
{
  "dish": string|null,                // concise dish name (e.g., "Bibimbap")
  "ingredients": string[],            // probable key ingredients
  "allergens": string[],              // common allergens present (milk, egg, wheat, soy, peanut, tree nuts, fish, shellfish, sesame, gluten)
  "estimated_macros": {               // approximate macros per visible single serving
    "calories": number|null,
    "protein_g": number|null,
    "carbs_g": number|null,
    "fat_g": number|null
  },
  "confidence": number,               // 0-1 overall identification confidence
  "notes": string                     // short Korean summary
}
Guidelines:
- If uncertain on macros put null.
- Use lowercase for allergen tokens.
- Keep notes concise in Korean.
`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      { parts: [ { text: prompt }, { inline_data: { mime_type: mime || 'image/jpeg', data: base64 } } ] }
    ],
    generationConfig: { temperature: 0.15 },
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const parsed = parseJsonBlock(text);
  return parsed;
}

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, message: 'POST only' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }
    const started = Date.now();
    const form = await req.formData().catch(() => null);
    if (!form) return new Response(JSON.stringify({ ok: false, message: 'invalid form' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const file = form.get('file') as File | null;
    if (!file) return new Response(JSON.stringify({ ok: false, message: 'file required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const maxBytes = 6 * 1024 * 1024; // 6MB safeguard
    if (bytes.byteLength > maxBytes) {
      return new Response(JSON.stringify({ ok: false, message: `file too large (> ${maxBytes} bytes)` }), { status: 413, headers: { 'Content-Type': 'application/json' } });
    }
    const base64 = encodeBase64(bytes);
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-pro';
    let geminiData: any = null;
    let rawModel: string | undefined;
    if (apiKey) {
      geminiData = await callGemini(base64, file.type || 'image/jpeg', model, apiKey).catch(e => ({ error: String(e) }));
      rawModel = (geminiData && geminiData.raw) ? geminiData.raw : undefined;
    }
    const durationMs = Date.now() - started;
    const dishName = geminiData?.dish ?? null;
    const ingredients = Array.isArray(geminiData?.ingredients) ? geminiData.ingredients : [];
    const allergens = Array.isArray(geminiData?.allergens) ? geminiData.allergens : [];
    const estimated_macros: MacroBlock = geminiData?.estimated_macros || { calories: null, protein_g: null, carbs_g: null, fat_g: null };
    const confidence = typeof geminiData?.confidence === 'number' ? geminiData.confidence : 0;
    const notes = geminiData?.notes || (geminiData?.error ? '모델 호출 오류' : geminiData?.raw ? '모델 JSON 파싱 실패 raw 제공' : '');

    const data = {
      kind: 'food',
      version: 'v4-dish',
      model,
      durationMs,
      dish: dishName,
      ingredients,
      allergens,
      estimated_macros,
      confidence,
      notes,
      fileMeta: { name: file.name, size: file.size, type: file.type },
      geminiUsed: Boolean(apiKey),
      rawModel,
    };

    return new Response(JSON.stringify({ ok: true, data }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
