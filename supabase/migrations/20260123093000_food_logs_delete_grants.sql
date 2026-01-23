-- Ensure authenticated role has table privileges for CRUD on food_logs.
-- RLS policies still restrict access to own rows.

begin;

-- Schema usage (usually already granted, but keep idempotent)
grant usage on schema public to authenticated;

-- Table privileges
grant select, insert, update, delete on table public.food_logs to authenticated;

commit;
