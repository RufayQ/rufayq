-- Transport ticket scan metadata + private bucket for analyzed page images.
ALTER TABLE public.transport_tickets
  ADD COLUMN IF NOT EXISTS extraction_provider text
    CHECK (extraction_provider IS NULL OR extraction_provider IN ('openai','gemini')),
  ADD COLUMN IF NOT EXISTS extraction_confidence numeric(3,2)
    CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1)),
  ADD COLUMN IF NOT EXISTS detected_language text,
  ADD COLUMN IF NOT EXISTS extraction_translated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extraction_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_image_paths text[] NOT NULL DEFAULT '{}';

-- Private bucket for analyzed scan pages.
INSERT INTO storage.buckets (id, name, public)
VALUES ('transport-scans','transport-scans', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS helper: predicate matching owner folder (auth.uid() or device:<x-device-id>).
-- Storage objects path: <ownerFolder>/<ticketId>/page-N.png
DROP POLICY IF EXISTS "transport_scans_select_own" ON storage.objects;
DROP POLICY IF EXISTS "transport_scans_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "transport_scans_update_own" ON storage.objects;
DROP POLICY IF EXISTS "transport_scans_delete_own" ON storage.objects;

CREATE POLICY "transport_scans_select_own"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transport-scans' AND (
    public.has_role(auth.uid(),'admin')
    OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (
      NULLIF(current_setting('request.headers', true)::json ->> 'x-device-id','') IS NOT NULL
      AND (storage.foldername(name))[1] = 'device:' || (current_setting('request.headers', true)::json ->> 'x-device-id')
    )
  )
);

CREATE POLICY "transport_scans_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transport-scans' AND (
    public.has_role(auth.uid(),'admin')
    OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (
      NULLIF(current_setting('request.headers', true)::json ->> 'x-device-id','') IS NOT NULL
      AND (storage.foldername(name))[1] = 'device:' || (current_setting('request.headers', true)::json ->> 'x-device-id')
    )
  )
);

CREATE POLICY "transport_scans_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'transport-scans' AND (
    public.has_role(auth.uid(),'admin')
    OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (
      NULLIF(current_setting('request.headers', true)::json ->> 'x-device-id','') IS NOT NULL
      AND (storage.foldername(name))[1] = 'device:' || (current_setting('request.headers', true)::json ->> 'x-device-id')
    )
  )
);

CREATE POLICY "transport_scans_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'transport-scans' AND (
    public.has_role(auth.uid(),'admin')
    OR (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR (
      NULLIF(current_setting('request.headers', true)::json ->> 'x-device-id','') IS NOT NULL
      AND (storage.foldername(name))[1] = 'device:' || (current_setting('request.headers', true)::json ->> 'x-device-id')
    )
  )
);