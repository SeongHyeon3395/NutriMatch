// @ts-nocheck
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getBearerToken(req: Request) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || '';
}

const FOOD_IMAGES_BUCKET = 'food-images';

async function tryDeleteUserStorageObjects(supabase: any, userId: string) {
  try {
    const { data: items, error: listErr } = await supabase.storage.from(FOOD_IMAGES_BUCKET).list(userId, {
      limit: 1000,
      offset: 0,
    });
    if (listErr) return;
    if (!Array.isArray(items) || items.length === 0) return;

    const paths = items
      .filter((it: any) => it && typeof it.name === 'string' && it.name.length > 0)
      .map((it: any) => `${userId}/${it.name}`);

    if (paths.length === 0) return;
    await supabase.storage.from(FOOD_IMAGES_BUCKET).remove(paths);
  } catch {
    // ignore
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, message: 'POST only' });

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return json(500, {
        ok: false,
        message: '서버 설정 오류: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.',
      });
    }

    const token = getBearerToken(req);
    if (!token) return json(401, { ok: false, message: '인증 토큰이 필요합니다.' });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token -> user
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return json(401, { ok: false, message: '유효하지 않은 세션입니다. 다시 로그인해주세요.' });
    }

    const userId = userData.user.id;

    // Delete history data
    try {
      await supabase.from('food_logs').delete().eq('user_id', userId);
    } catch {
      // ignore
    }
    try {
      await supabase.from('body_logs').delete().eq('user_id', userId);
    } catch {
      // ignore
    }
    try {
      // 최근 만든 식단(식단 생성 기록)도 초기화
      await supabase.from('meal_plan_logs').delete().eq('user_id', userId);
    } catch {
      // ignore
    }

    // Reset body info and force onboarding again (step 4)
    try {
      await supabase
        .from('app_users')
        .update({
          onboarding_completed: false,
          current_weight: null,
          target_weight: null,
          height: null,
          age: null,
          gender: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch {
      // ignore
    }

    // Best-effort cleanup: food images belong to deleted history
    await tryDeleteUserStorageObjects(supabase, userId);

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { ok: false, message: e?.message || String(e) });
  }
});
