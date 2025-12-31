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

function isStrongPassword(value: string) {
  return value.length >= 8 && /[^A-Za-z0-9]/.test(value);
}

function usernameToEmail(username: string) {
  // Supabase Auth는 email/password를 기본 식별자로 사용하므로,
  // 앱의 "아이디"를 내부 이메일로 매핑합니다.
  return `${username}@nutrimatch.local`;
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
    const nickname = String(body?.nickname ?? '').trim();
    const password = String(body?.password ?? '');
    const deviceId = String(body?.deviceId ?? '').trim();

    if (!username) return json(400, { ok: false, message: '아이디가 필요합니다.' });
    if (!nickname) return json(400, { ok: false, message: '닉네임이 필요합니다.' });
    if (!deviceId) return json(400, { ok: false, message: 'deviceId가 필요합니다.' });
    if (!isStrongPassword(password)) {
      return json(400, { ok: false, message: '비밀번호는 8자 이상, 특수문자를 포함해야 합니다.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // deviceId 중복 체크
    const { data: existingDevice, error: deviceErr } = await supabase
      .from('app_users')
      .select('id')
      .eq('device_id', deviceId)
      .maybeSingle();
    if (deviceErr) throw deviceErr;
    if (existingDevice?.id) {
      return json(409, { ok: false, message: '이미 무료 혜택을 사용한 기기입니다.' });
    }

    // username 중복 체크
    const { data: existingUser, error: userErr } = await supabase
      .from('app_users')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (userErr) throw userErr;
    if (existingUser?.id) {
      return json(409, { ok: false, message: '이미 사용 중인 아이디입니다.' });
    }

    // 1) Supabase Auth Users 생성 (Authentication > Users에 표시됨)
    const email = usernameToEmail(username);
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        nickname,
        device_id: deviceId,
      },
    });
    if (createErr) {
      const msg = String(createErr?.message || createErr);
      if (/already\s*registered|already\s*exists|duplicate/i.test(msg)) {
        return json(409, { ok: false, message: '이미 사용 중인 아이디입니다.' });
      }
      throw createErr;
    }
    const authUserId = created?.user?.id;
    if (!authUserId) throw new Error('Auth 사용자 생성에 실패했습니다.');

    // 2) 앱 프로필 테이블에 저장(아이디/닉네임/기기ID)
    // 기존 스키마 호환을 위해 password_hash/password_salt는 nullable로 전환되어 있어야 합니다.
    const { data: inserted, error: insertErr } = await supabase
      .from('app_users')
      .insert({
        id: authUserId,
        username,
        nickname,
        device_id: deviceId,
      })
      .select('id')
      .single();

    if (insertErr) {
      // app_users 저장 실패 시 Auth 유저도 정리(고아 계정 방지)
      try {
        await supabase.auth.admin.deleteUser(authUserId);
      } catch {
        // ignore
      }
      throw insertErr;
    }

    // 무료 혜택 사용 기록(원하면 별도 정책/테이블로 관리)
    // 로그 테이블 insert 실패는 회원가입 자체를 막지 않음
    try {
      await supabase.from('free_trial_logs').insert({ device_id: deviceId, user_id: inserted.id });
    } catch {
      // ignore
    }

    return json(200, { ok: true, data: { userId: inserted.id } });
  } catch (e: any) {
    return json(500, { ok: false, message: e?.message || String(e) });
  }
});
