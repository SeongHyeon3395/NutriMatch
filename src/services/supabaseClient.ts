import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_ANON_KEY } from '../config';
// Prefer SUPABASE_URL from env if present; otherwise try to derive from BASE_URL
import { BASE_URL as DERIVED_BASE_URL } from '../config';

// If user provides SUPABASE_URL in .env, use it; else strip trailing /functions/v1 if present
// We import it dynamically to avoid circular issues
let SUPABASE_URL: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const env = require('@env');
  SUPABASE_URL = env.SUPABASE_URL;
} catch {}

function deriveSupabaseUrl(): string {
  const fallback = (DERIVED_BASE_URL || '').trim().replace(/\/$/, '');
  if (!fallback) return '';

  // Supported fallbacks:
  // 1) https://<ref>.supabase.co/functions/v1 -> https://<ref>.supabase.co
  // 2) https://<ref>.functions.supabase.co -> https://<ref>.supabase.co
  // 3) https://<ref>.functions.supabase.co/functions/v1 -> https://<ref>.supabase.co
  const stripped = fallback.replace(/\/functions\/v1\/?$/, '');
  return stripped.replace(/\.functions\.supabase\.co$/i, '.supabase.co');
}

const url = (SUPABASE_URL || deriveSupabaseUrl()).replace(/\/$/, '');

export const isSupabaseConfigured = Boolean(url) && Boolean(SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(url, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
