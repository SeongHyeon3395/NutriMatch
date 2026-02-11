-- Squashed migrations (keep only this file)
-- Generated at: 2026-02-02
--
-- NOTE:
-- - This file intentionally contains the contents of multiple older migration files,
--   concatenated in chronological order.
-- - We keep BEGIN/COMMIT blocks as-is.

-- =========================================================
-- 20260107091000_unified_schema_safe.sql
-- =========================================================
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

-- =========================================================
-- 20260108090000_remove_device_restrictions.sql
-- =========================================================
-- Remove device-based restrictions (signup should be device-independent)

-- app_users.device_id is no longer required nor unique
alter table if exists public.app_users
  alter column device_id drop not null;

drop index if exists public.ux_app_users_device_id;

-- free_trial_logs is no longer device-bound
alter table if exists public.free_trial_logs
  alter column device_id drop not null;

drop index if exists public.ux_free_trial_logs_device_id;

-- =========================================================
-- 20260112093000_profile_avatars_storage_policies.sql
-- =========================================================
-- =========================================================
-- Storage policies (profile-avatars)
-- =========================================================
-- 전제: 버킷 profile-avatars 는 Dashboard에서 Public OFF(비공개) 설정
-- Storage 정책은 storage.objects에 설정합니다.

drop policy if exists "profile-avatars insert own" on storage.objects;
create policy "profile-avatars insert own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile-avatars select own" on storage.objects;
create policy "profile-avatars select own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile-avatars delete own" on storage.objects;
create policy "profile-avatars delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================================
-- 20260123093000_food_logs_delete_grants.sql
-- =========================================================
-- Ensure authenticated role has table privileges for CRUD on food_logs.
-- RLS policies still restrict access to own rows.

begin;

-- Schema usage (usually already granted, but keep idempotent)
grant usage on schema public to authenticated;

-- Table privileges
grant select, insert, update, delete on table public.food_logs to authenticated;

commit;

-- =========================================================
-- 20260123101000_add_food_logs_image_path.sql
-- =========================================================
-- Add image_path to food_logs for storage-backed images.
-- Some remote DBs may be missing this column (older schema).

begin;

alter table if exists public.food_logs
  add column if not exists image_path text;

commit;

-- =========================================================
-- 20260123103000_scan_events_consumable.sql
-- =========================================================
-- Consumable scan usage: deleting history must not refund monthly quota.

begin;

-- 1) Event table
create table if not exists public.scan_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'food_scan',
  food_log_id uuid null references public.food_logs(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_scan_events_user_occurred_at
on public.scan_events (user_id, occurred_at desc);

alter table public.scan_events enable row level security;

-- RLS: own rows only
drop policy if exists "select own scan_events" on public.scan_events;
create policy "select own scan_events"
on public.scan_events
for select
to authenticated
using (user_id = auth.uid());

-- no insert/update/delete from client (service_role or trigger only)

-- 2) Trigger: when a food_log is inserted, record a scan event
create or replace function public.trg_record_scan_event()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.scan_events(user_id, source, food_log_id, occurred_at)
  values (new.user_id, 'food_log_insert', new.id, new.occurred_at);
  return new;
end;
$$;

drop trigger if exists trg_food_logs_record_scan_event on public.food_logs;
create trigger trg_food_logs_record_scan_event
after insert on public.food_logs
for each row execute function public.trg_record_scan_event();

-- 3) New monthly count based on scan_events (consumable)
create or replace function public.get_monthly_scan_count_consumed(p_month timestamptz default now())
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.scan_events
  where user_id = auth.uid()
    and occurred_at >= date_trunc('month', p_month)
    and occurred_at <  (date_trunc('month', p_month) + interval '1 month');
$$;

grant execute on function public.get_monthly_scan_count_consumed(timestamptz) to authenticated;

-- Optional: keep old function for backwards compatibility

commit;

-- =========================================================
-- 20260129090000_scan_quota_consume_on_analyze.sql
-- =========================================================
-- Move scan quota consumption to "analyze start" instead of "save food log"

begin;

-- 1) Stop consuming scans on food_logs insert (saving should not spend quota)
drop trigger if exists trg_food_logs_record_scan_event on public.food_logs;
drop function if exists public.trg_record_scan_event();

-- 2) Normalize existing events so past consumption is preserved
update public.scan_events
set source = 'food_analyze'
where source in ('food_log_insert', 'food_scan');

-- Helpful index for monthly counts by source
create index if not exists idx_scan_events_user_source_occurred_at
on public.scan_events (user_id, source, occurred_at desc);

-- 3) Consume quota explicitly at analysis time
create or replace function public.consume_monthly_scan(
  p_limit integer,
  p_source text default 'food_analyze',
  p_month timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if auth.uid() is null then
    raise exception using message = 'NOT_AUTHENTICATED';
  end if;

  if p_limit is null or p_limit <= 0 then
    raise exception using message = 'INVALID_LIMIT';
  end if;

  if p_source is null or length(trim(p_source)) = 0 then
    p_source := 'food_analyze';
  end if;

  select count(*)::int
    into current_count
  from public.scan_events
  where user_id = auth.uid()
    and source = p_source
    and occurred_at >= date_trunc('month', p_month)
    and occurred_at <  (date_trunc('month', p_month) + interval '1 month');

  if current_count >= p_limit then
    raise exception using message = 'SCAN_LIMIT_REACHED';
  end if;

  insert into public.scan_events(user_id, source, food_log_id, occurred_at)
  values (auth.uid(), p_source, null, now());

  return current_count + 1;
end;
$$;

grant execute on function public.consume_monthly_scan(integer, text, timestamptz) to authenticated;

-- Refund last scan event (for when analysis fails)
create or replace function public.refund_last_scan(
  p_source text default 'food_analyze'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  last_event_id bigint;
begin
  if auth.uid() is null then
    raise exception using message = 'NOT_AUTHENTICATED';
  end if;

  if p_source is null or length(trim(p_source)) = 0 then
    p_source := 'food_analyze';
  end if;

  -- Get the most recent scan event for this user and source
  select id into last_event_id
  from public.scan_events
  where user_id = auth.uid()
    and source = p_source
  order by occurred_at desc, id desc
  limit 1;

  if last_event_id is null then
    return false; -- No event to refund
  end if;

  -- Delete the last scan event
  delete from public.scan_events
  where id = last_event_id;

  return true;
end;
$$;

grant execute on function public.refund_last_scan(text) to authenticated;

-- 4) Monthly count should reflect consumed scan events only
create or replace function public.get_monthly_scan_count_consumed(p_month timestamptz default now())
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.scan_events
  where user_id = auth.uid()
    and source = 'food_analyze'
    and occurred_at >= date_trunc('month', p_month)
    and occurred_at <  (date_trunc('month', p_month) + interval '1 month');
$$;

grant execute on function public.get_monthly_scan_count_consumed(timestamptz) to authenticated;

commit;

-- =========================================================
-- 20260129094000_monthly_diet_scores_timeline.sql
-- =========================================================
-- Monthly diet score timeline (up to 36 months)

begin;

create or replace function public.get_monthly_diet_scores(
  p_months integer default 36,
  p_base_month timestamptz default now()
)
returns table(
  month_start timestamptz,
  avg_score100 integer,
  logs_count integer
)
language sql
stable
as $$
  with params as (
    select
      greatest(1, least(coalesce(p_months, 36), 36))::int as months,
      date_trunc('month', coalesce(p_base_month, now()))::timestamptz as base_month
  ),
  months as (
    select (p.base_month - (gs.i || ' months')::interval)::timestamptz as month_start
    from params p
    join lateral generate_series(0, (p.months - 1)) as gs(i) on true
  ),
  scored as (
    select
      fl.user_id,
      fl.occurred_at,
      date_trunc('month', fl.occurred_at)::timestamptz as month_start,
      -- Prefer userAnalysis.score100; fallback to grade mapping
      coalesce(
        nullif((fl.analysis->'userAnalysis'->>'score100')::numeric, null),
        case (fl.analysis->'userAnalysis'->>'grade')
          when 'very_good' then 90
          when 'good' then 75
          when 'neutral' then 60
          when 'bad' then 40
          when 'very_bad' then 20
          else null
        end
      )::numeric as score100
    from public.food_logs fl
    where fl.user_id = auth.uid()
  )
  select
    m.month_start,
    case
      when count(s.score100) = 0 then null
      else greatest(0, least(100, round(avg(s.score100))::int))
    end as avg_score100,
    count(s.score100)::int as logs_count
  from months m
  left join scored s
    on s.month_start = m.month_start
  group by m.month_start
  order by m.month_start desc;
$$;

grant execute on function public.get_monthly_diet_scores(integer, timestamptz) to authenticated;

commit;

-- =========================================================
-- 20260129095000_monthly_diet_scores_from_2026.sql
-- =========================================================
-- Show/compute monthly diet scores only from 2026-01-01

begin;

create or replace function public.get_monthly_diet_scores(
  p_months integer default 36,
  p_base_month timestamptz default now()
)
returns table(
  month_start timestamptz,
  avg_score100 integer,
  logs_count integer
)
language sql
stable
as $$
  with params as (
    select
      greatest(1, least(coalesce(p_months, 36), 36))::int as months,
      date_trunc('month', coalesce(p_base_month, now()))::timestamptz as base_month,
      '2026-01-01'::timestamptz as min_month
  ),
  months as (
    select (p.base_month - (gs.i || ' months')::interval)::timestamptz as month_start
    from params p
    join lateral generate_series(0, (p.months - 1)) as gs(i) on true
    where (p.base_month - (gs.i || ' months')::interval)::timestamptz >= p.min_month
  ),
  scored as (
    select
      fl.user_id,
      fl.occurred_at,
      date_trunc('month', fl.occurred_at)::timestamptz as month_start,
      coalesce(
        nullif((fl.analysis->'userAnalysis'->>'score100')::numeric, null),
        case (fl.analysis->'userAnalysis'->>'grade')
          when 'very_good' then 90
          when 'good' then 75
          when 'neutral' then 60
          when 'bad' then 40
          when 'very_bad' then 20
          else null
        end
      )::numeric as score100
    from public.food_logs fl
    cross join params p
    where fl.user_id = auth.uid()
      and fl.occurred_at >= p.min_month
  )
  select
    m.month_start,
    case
      when count(s.score100) = 0 then null
      else greatest(0, least(100, round(avg(s.score100))::int))
    end as avg_score100,
    count(s.score100)::int as logs_count
  from months m
  left join scored s
    on s.month_start = m.month_start
  group by m.month_start
  order by m.month_start desc;
$$;

grant execute on function public.get_monthly_diet_scores(integer, timestamptz) to authenticated;

commit;

-- =========================================================
-- 20260129102000_meal_plan_quota_monthly.sql
-- =========================================================
begin;

-- Monthly quota for AI meal plan generation (separate from scan_events)

create table if not exists public.meal_plan_events (
  id bigserial primary key,
  user_id uuid not null,
  source text not null default 'meal_plan_generate',
  occurred_at timestamptz not null default now()
);

create index if not exists idx_meal_plan_events_user_source_occurred_at
on public.meal_plan_events (user_id, source, occurred_at desc);

alter table public.meal_plan_events enable row level security;

drop policy if exists "select own meal_plan_events" on public.meal_plan_events;
create policy "select own meal_plan_events"
on public.meal_plan_events
for select
to authenticated
using (auth.uid() = user_id);

-- Note: inserts are done via SECURITY DEFINER function below.

create or replace function public.consume_monthly_meal_plan(
  p_limit integer,
  p_source text default 'meal_plan_generate',
  p_month timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if auth.uid() is null then
    raise exception using message = 'NOT_AUTHENTICATED';
  end if;

  if p_limit is null or p_limit <= 0 then
    raise exception using message = 'INVALID_LIMIT';
  end if;

  if p_source is null or length(trim(p_source)) = 0 then
    p_source := 'meal_plan_generate';
  end if;

  select count(*)::int
    into current_count
  from public.meal_plan_events
  where user_id = auth.uid()
    and source = p_source
    and occurred_at >= date_trunc('month', p_month)
    and occurred_at <  (date_trunc('month', p_month) + interval '1 month');

  if current_count >= p_limit then
    raise exception using message = 'MEAL_PLAN_LIMIT_REACHED';
  end if;

  insert into public.meal_plan_events(user_id, source, occurred_at)
  values (auth.uid(), p_source, now());

  return current_count + 1;
end;
$$;

grant execute on function public.consume_monthly_meal_plan(integer, text, timestamptz) to authenticated;

create or replace function public.get_monthly_meal_plan_count_consumed(p_month timestamptz default now())
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.meal_plan_events
  where user_id = auth.uid()
    and source = 'meal_plan_generate'
    and occurred_at >= date_trunc('month', p_month)
    and occurred_at <  (date_trunc('month', p_month) + interval '1 month');
$$;

grant execute on function public.get_monthly_meal_plan_count_consumed(timestamptz) to authenticated;

commit;

-- =========================================================
-- 20260129113000_meal_plan_logs.sql
-- =========================================================
begin;

-- Persist generated meal plans as user history

create table if not exists public.meal_plan_logs (
  id bigserial primary key,
  user_id uuid not null,
  mode text not null,
  pantry_items text[] null,
  result jsonb not null,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_meal_plan_logs_user_occurred_at
on public.meal_plan_logs (user_id, occurred_at desc);

alter table public.meal_plan_logs enable row level security;

drop policy if exists "select own meal_plan_logs" on public.meal_plan_logs;
create policy "select own meal_plan_logs"
on public.meal_plan_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own meal_plan_logs" on public.meal_plan_logs;
create policy "insert own meal_plan_logs"
on public.meal_plan_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "delete own meal_plan_logs" on public.meal_plan_logs;
create policy "delete own meal_plan_logs"
on public.meal_plan_logs
for delete
to authenticated
using (auth.uid() = user_id);

commit;

-- =========================================================
-- 20260129120000_meal_plan_logs_preview.sql
-- =========================================================
begin;

-- Add preview columns to avoid fetching large JSON on list views

alter table if exists public.meal_plan_logs
  add column if not exists preview_title text,
  add column if not exists preview_kcal integer;

-- Backfill preview fields from result JSON (best-effort)
update public.meal_plan_logs
set
  preview_title = coalesce(
    nullif(result #>> '{plan,0,meals,lunch,name}', ''),
    nullif(result #>> '{plan,0,meals,breakfast,name}', ''),
    nullif(result #>> '{plan,0,meals,dinner,name}', ''),
    preview_title,
    '식단'
  ),
  preview_kcal = coalesce(
    nullif((result #>> '{plan,0,totals,calories}')::numeric, null)::int,
    preview_kcal,
    0
  )
where preview_title is null or preview_kcal is null;

create index if not exists idx_meal_plan_logs_user_occurred_at
on public.meal_plan_logs (user_id, occurred_at desc);

commit;

-- =========================================================
-- 20260129123000_meal_plan_logs_meal_names.sql (original)
-- =========================================================
begin;

-- Store meal names for fast dedupe checks (avoid fetching full JSON)

alter table if exists public.meal_plan_logs
  add column if not exists meal_names text[];

-- Backfill from existing JSON (collect distinct names across all days/meals)
with extracted as (
  select
    mpl.id,
    array_remove(array_agg(distinct v.name), null) as names
  from public.meal_plan_logs mpl
  left join lateral (
    select nullif(trim(x), '') as name
    from (
      select jsonb_extract_path_text(day.value, 'meals', 'breakfast', 'name') as x
      from jsonb_array_elements(coalesce(mpl.result->'plan', '[]'::jsonb)) as day
      union all
      select jsonb_extract_path_text(day.value, 'meals', 'lunch', 'name') as x
      from jsonb_array_elements(coalesce(mpl.result->'plan', '[]'::jsonb)) as day
      union all
      select jsonb_extract_path_text(day.value, 'meals', 'dinner', 'name') as x
      from jsonb_array_elements(coalesce(mpl.result->'plan', '[]'::jsonb)) as day
    ) t
  ) v on true
  group by mpl.id
)
update public.meal_plan_logs mpl
set meal_names = e.names
from extracted e
where mpl.id = e.id
  and (mpl.meal_names is null or array_length(mpl.meal_names, 1) is null);

-- Optional index for overlap queries
create index if not exists idx_meal_plan_logs_meal_names_gin
on public.meal_plan_logs using gin (meal_names);

commit;
