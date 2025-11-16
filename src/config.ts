// Backend base URL
// If using Supabase Edge Functions, set to: https://<project-ref>.functions.supabase.co
// For local server testing (Android emulator): http://10.0.2.2:8080
// For iOS simulator local server: http://localhost:8080
export const BASE_URL = 'https://<PROJECT-REF>.functions.supabase.co';

export const ENDPOINTS = {
  analyzeBarcodeImage: '/analyze/barcode-image',
  analyzeFoodImage: '/analyze/food-image',
} as const;

// Supabase client headers
// Use anon key for public functions or user access token for authenticated calls.
export const SUPABASE_ANON_KEY = '<SUPABASE_ANON_KEY>';
export function buildSupabaseHeaders(token?: string) {
  const bearer = token || SUPABASE_ANON_KEY;
  return {
    Accept: 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${bearer}`,
  } as const;
}
