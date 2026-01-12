-- NutriMatch: UNIFIED DATABASE SCHEMA (safe/idempotent)
-- 목적: 기존 DB에도 최대한 충돌 없이(가능한 범위에서) 필요한 테이블/컬럼/RLS/함수를 통합 적용
-- 주의:
-- - 이미 운영 데이터가 있는 DB에서 "완전 초기화" 용도로 쓰지 마세요.
-- - 기존 스키마가 다를 수 있으므로, create/drop policy/trigger는 의도적으로 재생성합니다.

-- UUID helper
create extension if not exists "pgcrypto";

-- =========================================================
-- 0) Common: updated_at trigger helper
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 1) Profile: app_users (user-editable fields)
-- =========================================================
create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  nickname text not null,
  device_id text not null,

  -- profile avatar
  avatar_path text,

  -- onboarding / profile fields
  body_goal text,
  health_diet text,
  lifestyle_diet text,
  allergens text[] not null default '{}'::text[],
  onboarding_completed boolean not null default false,

  -- body info (editable from app)
  current_weight numeric,
  target_weight numeric,
  height numeric,
  age integer,
  gender text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure missing columns exist (older schemas)
alter table public.app_users
  add column if not exists avatar_path text,
  add column if not exists body_goal text,
  add column if not exists health_diet text,
  add column if not exists lifestyle_diet text,
  add column if not exists allergens text[] not null default '{}'::text[],
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists current_weight numeric,
  add column if not exists target_weight numeric,
  add column if not exists height numeric,
  add column if not exists age integer,
  add column if not exists gender text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Unique constraints (safe form via unique index)
create unique index if not exists ux_app_users_username on public.app_users (username);
create unique index if not exists ux_app_users_device_id on public.app_users (device_id);

alter table public.app_users enable row level security;

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

-- RLS: 본인만 조회/수정 가능
drop policy if exists "select own app_users" on public.app_users;
create policy "select own app_users"
on public.app_users
for select
to authenticated
using (id = auth.uid());

drop policy if exists "update own app_users" on public.app_users;
create policy "update own app_users"
on public.app_users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- (insert 정책 없음) 회원가입 시 app_users row는 Edge Function(service_role)에서 insert 권장

-- =========================================================
-- 2) Free trial (device-based anti-abuse)
-- =========================================================
create table if not exists public.free_trial_logs (
  id bigserial primary key,
  device_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_free_trial_logs_device_id on public.free_trial_logs (device_id);

alter table public.free_trial_logs enable row level security;
-- (의도적으로 정책 없음) service_role로만 접근 권장

-- =========================================================
-- 3) History: food_logs (analysis success only)
-- =========================================================
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- image_uri: RN 로컬 경로(기기 의존). 운영에서는 Storage 경로 image_path 사용 권장
  image_uri text,
  image_path text,

  analysis jsonb,
  meal_type text,
  occurred_at timestamptz not null default now(),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.food_logs enable row level security;

drop trigger if exists trg_food_logs_updated_at on public.food_logs;
create trigger trg_food_logs_updated_at
before update on public.food_logs
for each row execute function public.set_updated_at();

create index if not exists idx_food_logs_user_occurred_at
on public.food_logs (user_id, occurred_at desc);

-- RLS: 본인 데이터만 CRUD
drop policy if exists "select own food_logs" on public.food_logs;
create policy "select own food_logs"
on public.food_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "insert own food_logs" on public.food_logs;
create policy "insert own food_logs"
on public.food_logs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "update own food_logs" on public.food_logs;
create policy "update own food_logs"
on public.food_logs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "delete own food_logs" on public.food_logs;
create policy "delete own food_logs"
on public.food_logs
for delete
to authenticated
using (user_id = auth.uid());

-- 월간 분석 성공(스캔) 횟수
create or replace function public.get_monthly_scan_count(p_month timestamptz default now())
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.food_logs
  where user_id = auth.uid()
    and occurred_at >= date_trunc('month', p_month)
    and occurred_at <  (date_trunc('month', p_month) + interval '1 month');
$$;

grant execute on function public.get_monthly_scan_count(timestamptz) to authenticated;

-- =========================================================
-- 4) Body tracking: body_logs
-- =========================================================
create table if not exists public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric,
  muscle_mass numeric,
  body_fat numeric,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.body_logs enable row level security;

drop trigger if exists trg_body_logs_updated_at on public.body_logs;
create trigger trg_body_logs_updated_at
before update on public.body_logs
for each row execute function public.set_updated_at();

create index if not exists idx_body_logs_user_occurred_at
on public.body_logs (user_id, occurred_at desc);

-- RLS
drop policy if exists "select own body_logs" on public.body_logs;
create policy "select own body_logs"
on public.body_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "insert own body_logs" on public.body_logs;
create policy "insert own body_logs"
on public.body_logs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "update own body_logs" on public.body_logs;
create policy "update own body_logs"
on public.body_logs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "delete own body_logs" on public.body_logs;
create policy "delete own body_logs"
on public.body_logs
for delete
to authenticated
using (user_id = auth.uid());

-- =========================================================
-- 5) Notification settings
-- =========================================================
create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  meal_reminder boolean not null default false,
  weekly_summary boolean not null default false,
  tips boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

drop trigger if exists trg_notification_settings_updated_at on public.notification_settings;
create trigger trg_notification_settings_updated_at
before update on public.notification_settings
for each row execute function public.set_updated_at();

-- RLS
drop policy if exists "select own notification_settings" on public.notification_settings;
create policy "select own notification_settings"
on public.notification_settings
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "insert own notification_settings" on public.notification_settings;
create policy "insert own notification_settings"
on public.notification_settings
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "update own notification_settings" on public.notification_settings;
create policy "update own notification_settings"
on public.notification_settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- app_users가 생성될 때 기본 알림 row 자동 생성
create or replace function public.ensure_notification_settings_row()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notification_settings(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

alter function public.ensure_notification_settings_row() set search_path = public;

drop trigger if exists trg_app_users_notification_defaults on public.app_users;
create trigger trg_app_users_notification_defaults
after insert on public.app_users
for each row execute function public.ensure_notification_settings_row();

-- =========================================================
-- 6) Storage policies (food-images)
-- =========================================================
-- 전제: 버킷 food-images 는 Dashboard에서 Public OFF(비공개) 설정
-- Storage 정책은 storage.objects에 설정합니다.

drop policy if exists "food-images insert own" on storage.objects;
create policy "food-images insert own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'food-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "food-images select own" on storage.objects;
create policy "food-images select own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'food-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "food-images delete own" on storage.objects;
create policy "food-images delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'food-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
