-- Ensure goal/diet columns exist on app_users
-- Generated at: 2026-02-12

begin;

alter table public.app_users
  add column if not exists body_goal text,
  add column if not exists health_diet text,
  add column if not exists lifestyle_diet text;

commit;
