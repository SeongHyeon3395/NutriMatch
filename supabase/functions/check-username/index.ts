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

function usernameToEmail(username: string) {
  return `${username}@nutrimatch.local`;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

    const body = await req.json().catch(() => null);
    const username = String(body?.username ?? '').trim();

    if (!username) return json(400, { ok: false, message: '아이디가 필요합니다.' });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 현재 정책: app_users.username 기준으로 사용 가능 여부 판단
    // (Auth email은 아이디로부터 결정적으로 생성되며, signup-device가 항상 app_users에 기록합니다.)
    // 필요 시 email = usernameToEmail(username) 도 함께 저장/검증하도록 확장 가능
    const _email = usernameToEmail(username);

    const { data, error } = await supabase.from('app_users').select('id').eq('username', username).maybeSingle();

    if (error) throw error;

    const available = !data?.id;
    return json(200, { ok: true, data: { available } });
  } catch (e: any) {
    return json(500, { ok: false, message: e?.message || String(e) });
  }
});
