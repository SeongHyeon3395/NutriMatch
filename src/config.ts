import { BASE_URL as ENV_BASE_URL, SUPABASE_ANON_KEY as ENV_SUPABASE_ANON_KEY } from '@env';

// Backend base URL (injected from .env)
// Examples:
// - Supabase: https://<project-ref>.functions.supabase.co
// - Android emulator local: http://10.0.2.2:8080
// - iOS simulator local: http://localhost:8080
export const BASE_URL = (ENV_BASE_URL || '').replace(/\/$/, '');

export const ENDPOINTS = {
  analyzeBarcodeImage: '/analyze/barcode-image',
  analyzeFoodImage: '/analyze/food-image',
} as const;

// Supabase client headers
// Use anon key for public functions or user access token for authenticated calls.
export const SUPABASE_ANON_KEY = ENV_SUPABASE_ANON_KEY || '';
export function buildSupabaseHeaders(token?: string) {
  const bearer = token || SUPABASE_ANON_KEY;
  return {
    Accept: 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${bearer}`,
  } as const;
}
