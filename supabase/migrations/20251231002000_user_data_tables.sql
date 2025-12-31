-- NutriMatch: 사용자별 데이터(프로필/설정/기록) 테이블 + RLS 정책
-- 전제: Supabase Auth 사용(로그인 붙이면 auth.uid() 기반으로 사용자별 분리)

-- 1) app_users 확장: onboarding/플랜/쿼터 등 사용자별 설정 저장
alter table public.app_users
  add column if not exists body_goal text,
  add column if not exists health_diet text,
  add column if not exists lifestyle_diet text,
  add column if not exists allergens text[] not null default '{}'::text[],
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists plan_id text not null default 'free',
  add column if not exists premium_quota_remaining integer not null default 0,
  add column if not exists free_image_quota_remaining integer not null default 3,
  add column if not exists updated_at timestamptz not null default now();

-- updated_at 자동 갱신용 트리거
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

-- 2) 식단 기록
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_uri text,
  analysis jsonb,
  meal_type text,
  occurred_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- 3) 신체 기록
create table if not exists public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric,
  muscle_mass numeric,
  body_fat numeric,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.food_logs enable row level security;
alter table public.body_logs enable row level security;
-- app_users는 이미 RLS enabled 상태 (기존 마이그레이션)

-- 정책: 본인 데이터만 읽기/쓰기
-- app_users: 로그인한 본인만 select/update 가능
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

-- food_logs
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

-- body_logs
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
