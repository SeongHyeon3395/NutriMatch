import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((req: Request) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, message: 'GET only' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  const envGemini = Boolean((globalThis as any).Deno?.env?.get?.('GEMINI_API_KEY'));
  const model = (globalThis as any).Deno?.env?.get?.('GEMINI_MODEL') || 'gemini-1.5-flash';
  const data = {
    ok: true,
    service: 'health',
    version: 'v2',
    time: new Date().toISOString(),
    envGemini,
    model,
    functions: ['analyze-food-image','health'],
  } as const;
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
});
