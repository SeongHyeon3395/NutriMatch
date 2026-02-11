-- Storage 정책 생성
-- food-images 버킷

CREATE POLICY "Allow authenticated upload to food-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'food-images');

CREATE POLICY "Allow public read from food-images"
ON storage.objects FOR SELECT
TO public, authenticated
USING (bucket_id = 'food-images');

CREATE POLICY "Allow users to delete own food-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'food-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- profile-avatars 버킷

CREATE POLICY "Allow authenticated upload to profile-avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-avatars');

CREATE POLICY "Allow public read from profile-avatars"
ON storage.objects FOR SELECT
TO public, authenticated
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Allow users to delete own profile-avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
