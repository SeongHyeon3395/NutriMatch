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
