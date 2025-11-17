// @ts-nocheck
// Supabase Edge Function (Deno)
// Endpoint: https://<project-ref>.functions.supabase.co/analyze-barcode-image
// Receives multipart/form-data with 'file' field (image), returns JSON with barcode + ingredients via OFF
// Security: Set GEMINI_API_KEY as a Supabase secret: `supabase secrets set GEMINI_API_KEY=...`
// @ts-ignore types resolved in Deno runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

type OffProduct = {
  code?: string;
  product?: {
    product_name?: string;
    brands?: string;
    ingredients_text?: string;
    ingredients_text_ko?: string;
    nutriments?: Record<string, unknown>;
    image_small_url?: string;
    image_url?: string;
  };
  status?: number;
  status_verbose?: string;
};

async function extractBarcodeWithGemini(base64: string, mime: string) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt =
    "Extract ONLY the numeric EAN/UPC barcode number from this image. Return just the digits without spaces or text. If none, output NONE.";
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mime || "image/jpeg", data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const digits = (text.match(/\d+/g) || []).join("");
  if (digits.length < 8) return null;
  return digits;
}

async function lookupOpenFoodFacts(barcode: string) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const json = (await res.json().catch(() => ({}))) as OffProduct;
  if (json?.status !== 1) return null;
  return json;
}

async function extractIngredientsWithGemini(base64: string, mime: string) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt =
    "From the attached image, read the nutrition/ingredients label and return a concise JSON with fields {ingredients_text, allergens, nutrition_summary}. Keep Korean if present.";
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mime || "image/jpeg", data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  // Try to parse JSON inside model output
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { raw: text };
  try {
    return JSON.parse(match[0]);
  } catch {
    return { raw: text };
  }
}

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, message: "POST only" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const form = await req.formData().catch(() => null);
    if (!form) {
      return new Response(JSON.stringify({ ok: false, message: "invalid form" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const file = form.get("file") as File | null;
    if (!file) {
      return new Response(JSON.stringify({ ok: false, message: "file required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = encodeBase64(bytes);

    // 1) Extract barcode digits using Gemini Vision
    const barcode = await extractBarcodeWithGemini(base64, file.type || "image/jpeg");

    // 2) If barcode digits found, lookup Open Food Facts
    let off: OffProduct | null = null;
    if (barcode) {
      off = await lookupOpenFoodFacts(barcode);
    }

    // 3) If OFF missing or no ingredients, try Gemini to read label directly
    let geminiLabel: any = null;
    const offIngredients = off?.product?.ingredients_text_ko || off?.product?.ingredients_text;
    if (!offIngredients) {
      geminiLabel = await extractIngredientsWithGemini(base64, file.type || "image/jpeg");
    }

    const data = {
      kind: "barcode",
      barcode: barcode || null,
      sources: {
        openFoodFacts: off ? { status: off.status, status_verbose: off.status_verbose } : null,
        geminiUsed: Boolean(Deno.env.get("GEMINI_API_KEY")),
      },
      product: off?.product || null,
      ingredients_text: offIngredients || geminiLabel?.ingredients_text || null,
      gemini_fallback: geminiLabel || null,
      fileMeta: { name: file.name, size: file.size, type: file.type },
    };

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
