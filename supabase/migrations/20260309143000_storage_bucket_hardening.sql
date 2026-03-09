-- Ensure storage buckets and image columns exist for food/profile images

insert into storage.buckets (id, name, public)
values
  ('food-images', 'food-images', false),
  ('profile-avatars', 'profile-avatars', false)
on conflict (id) do nothing;

alter table if exists public.food_logs
  add column if not exists image_uri text,
  add column if not exists image_path text;

create index if not exists idx_food_logs_user_occurred_at
on public.food_logs (user_id, occurred_at desc);

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
