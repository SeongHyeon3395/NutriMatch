import { BASE_URL, ENDPOINTS, buildSupabaseHeaders } from '../config';
import type { GenerateMealPlanRequest, GenerateMealPlanResponse } from '../types/mealPlan';
import { supabase } from './supabaseClient';

export async function generateMealPlanRemote(payload: GenerateMealPlanRequest): Promise<GenerateMealPlanResponse> {
  // Prefer authenticated invoke when available (uses user session token).
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: payload,
      });
      if (error) {
        return { ok: false, message: String((error as any)?.message || error) };
      }
      // Edge functions typically return { ok, data }
      if (data?.ok === true) return data as GenerateMealPlanResponse;
      if (data?.ok === false) return data as GenerateMealPlanResponse;
      return { ok: true, data } as any;
    } catch (e: any) {
      return { ok: false, message: String(e?.message || e || 'UNKNOWN_ERROR') };
    }
  }

  // Fallback to fetch (anon). Useful when supabase client isn't configured.
  if (!BASE_URL) {
    return {
      ok: false,
      message:
        '환경변수 BASE_URL이 비어있습니다. .env에 BASE_URL(예: https://<project-ref>.functions.supabase.co)과 SUPABASE_ANON_KEY를 설정하고 Metro를 재시작하세요.',
    };
  }

  try {
    const res = await fetch(`${BASE_URL}${ENDPOINTS.generateMealPlan}`, {
      method: 'POST',
      headers: {
        ...buildSupabaseHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: String(json?.message || json?.error || `HTTP ${res.status}`) };
    }

    return json as GenerateMealPlanResponse;
  } catch (e: any) {
    return { ok: false, message: String(e?.message || e || 'UNKNOWN_ERROR') };
  }
}
