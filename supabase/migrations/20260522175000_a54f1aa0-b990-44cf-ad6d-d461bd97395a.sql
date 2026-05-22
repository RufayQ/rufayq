
-- 1) user_trials: replace broken policy with one scoped to caller's profile/device
DROP POLICY IF EXISTS "Auth user reads own trial via profile" ON public.user_trials;
CREATE POLICY "Auth user reads own trial via profile"
ON public.user_trials
FOR SELECT
TO authenticated
USING (
  device_id IN (
    SELECT p.device_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- 2) avatars bucket: scope insert/update/delete/list to owner folder
--    Folder convention: first segment = auth.uid() OR device_id header
DROP POLICY IF EXISTS "Anyone can update files in avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete files in avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can insert files in avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners can insert their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are listable by owner" ON storage.objects;

CREATE POLICY "Owners can insert their avatar"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (storage.foldername(name))[1] = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
  )
);

CREATE POLICY "Owners can update their avatar"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (storage.foldername(name))[1] = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (storage.foldername(name))[1] = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
  )
);

CREATE POLICY "Owners can delete their avatar"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (storage.foldername(name))[1] = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
  )
);

-- Owner-scoped SELECT (used by SDK listing). Public URLs still work because
-- the bucket itself remains public; this only restricts list/search via API.
CREATE POLICY "Avatars listable by owner"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (storage.foldername(name))[1] = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
  )
);

-- 3) billing_events: remove client INSERT capability (admin/SECURITY DEFINER only)
DROP POLICY IF EXISTS "User inserts own billing events" ON public.billing_events;
