ALTER TABLE public.transport_tickets
  ADD COLUMN IF NOT EXISTS extraction_provider text CHECK (extraction_provider IS NULL OR extraction_provider IN ('openai', 'gemini')),
  ADD COLUMN IF NOT EXISTS extraction_confidence numeric(3,2) CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1)),
  ADD COLUMN IF NOT EXISTS detected_language text,
  ADD COLUMN IF NOT EXISTS extraction_translated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extraction_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_image_paths text[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public)
VALUES ('transport-scans', 'transport-scans', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Path layout: <auth.uid() | device:x-device-id>/<ticket_id>/page-n.png
DROP POLICY IF EXISTS "owner can read transport scans" ON storage.objects;
CREATE POLICY "owner can read transport scans"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'transport-scans'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (storage.foldername(name))[1] = ('device:' || ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  )
);

DROP POLICY IF EXISTS "owner can upload transport scans" ON storage.objects;
CREATE POLICY "owner can upload transport scans"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'transport-scans'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (storage.foldername(name))[1] = ('device:' || ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  )
);

DROP POLICY IF EXISTS "owner can update transport scans" ON storage.objects;
CREATE POLICY "owner can update transport scans"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id = 'transport-scans'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (storage.foldername(name))[1] = ('device:' || ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  )
)
WITH CHECK (
  bucket_id = 'transport-scans'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (storage.foldername(name))[1] = ('device:' || ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  )
);

DROP POLICY IF EXISTS "owner can delete transport scans" ON storage.objects;
CREATE POLICY "owner can delete transport scans"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id = 'transport-scans'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (storage.foldername(name))[1] = ('device:' || ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  )
);
