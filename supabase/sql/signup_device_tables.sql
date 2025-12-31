-- NutriMatch: deviceId 기반 회원가입(아이디) + 무료혜택 중복 방지용 테이블
-- Supabase SQL Editor에서 실행하세요.

-- 1) 회원 테이블 (Auth 없이 커스텀 테이블로 관리)
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  nickname text not null,
  device_id text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);

-- 2) 무료 혜택 사용 기록 (device_id 중복 차단용)
create table if not exists public.free_trial_logs (
  id bigserial primary key,
  device_id text not null unique,
  user_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 추천: Edge Function이 service_role로만 접근하도록 RLS 켜고, 정책은 최소화
alter table public.app_users enable row level security;
alter table public.free_trial_logs enable row level security;

-- 앱(anon)에서 직접 insert/select를 막고, Edge Function(service_role)로만 처리하려면
-- 별도 정책을 만들지 않아도 됩니다(기본: 차단).
-- 만약 대시보드에서 조회/관리하려면 service_role 사용 또는 관리자 정책을 추가하세요.
