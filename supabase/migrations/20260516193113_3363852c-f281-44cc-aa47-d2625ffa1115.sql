
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS google_picture_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload to their device folder" ON storage.objects;
CREATE POLICY "Anyone can upload to their device folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can update files in avatars" ON storage.objects;
CREATE POLICY "Anyone can update files in avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can delete files in avatars" ON storage.objects;
CREATE POLICY "Anyone can delete files in avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');
