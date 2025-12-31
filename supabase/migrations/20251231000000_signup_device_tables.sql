-- NutriMatch: deviceId 기반 회원가입(아이디) + 무료혜택 중복 방지용 테이블

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  nickname text not null,
  device_id text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.free_trial_logs (
  id bigserial primary key,
  device_id text not null unique,
  user_id uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.free_trial_logs enable row level security;

-- 기본(정책 없음) 상태에서는 anon 접근이 차단됩니다.
-- app_users/free_trial_logs는 Edge Function(service_role)로만 접근하는 설계를 권장합니다.
