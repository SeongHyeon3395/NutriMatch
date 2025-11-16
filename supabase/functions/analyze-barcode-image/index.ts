// Supabase Edge Function (Deno)
// Endpoint: https://<project-ref>.functions.supabase.co/analyze-barcode-image
// Receives multipart/form-data with 'file' field (image), returns JSON
// @ts-ignore types resolved in Deno runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

    // TODO: Plug in a barcode decoding service here.
    // Example approach:
    // const bytes = new Uint8Array(await file.arrayBuffer());
    // call external API with bytes => result

    const data = {
      kind: "barcode",
      // placeholder to show the flow works end-to-end
      note: "Implement barcode detection/decoding with your preferred API",
      filename: file.name,
      size: file.size,
      type: file.type,
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
