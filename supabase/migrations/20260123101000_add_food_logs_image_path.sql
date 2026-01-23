-- Add image_path to food_logs for storage-backed images.
-- Some remote DBs may be missing this column (older schema).

begin;

alter table if exists public.food_logs
  add column if not exists image_path text;

commit;
