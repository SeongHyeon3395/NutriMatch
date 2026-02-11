-- Add macro target columns to app_users
-- Generated at: 2026-02-11

begin;

alter table public.app_users
  add column if not exists target_calories numeric,
  add column if not exists target_carbs numeric,
  add column if not exists target_protein numeric,
  add column if not exists target_fat numeric;

commit;
