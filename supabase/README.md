# Supabase Edge Functions for NutriMatch

This folder contains Supabase Edge Functions to analyze images captured in the app.

## Functions
- `analyze-barcode-image`: receive an image (`multipart/form-data`, field name: `file`), decode barcode via your chosen service, return JSON.
- `analyze-food-image`: receive an image (`file`), run OCR/LLM/Nutrition extraction, return JSON.

Both functions currently return placeholder JSON so you can validate the end-to-end flow.

## Setup
1. Install Supabase CLI and login
```sh
supabase login
```
2. Link your project (replace with your project ref)
```sh
supabase link --project-ref <YOUR_PROJECT_REF>
```
3. Create or deploy functions
```sh
supabase functions deploy analyze-barcode-image
supabase functions deploy analyze-food-image
```
4. Set any external API keys as function environment variables
```sh
# Required for barcode extraction and fallback OCR
supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

## Invoke
Edge Functions are available at:
```
https://<YOUR_PROJECT_REF>.functions.supabase.co/analyze-barcode-image
https://<YOUR_PROJECT_REF>.functions.supabase.co/analyze-food-image
```

Send a `POST` request with a `multipart/form-data` body and `file` field.

### analyze-barcode-image
- Extracts barcode digits from the photo using Gemini Vision
- Looks up product and ingredients via Open Food Facts (`/api/v2/product/{barcode}.json`)
- If OFF is missing ingredients, falls back to Gemini to read the label directly

## Security
- Prefer authenticated calls from the app: pass `Authorization: Bearer <user_access_token>` and `apikey: <anon_key>` headers.
- Keep external API keys only in Edge Functions via `supabase secrets`.
