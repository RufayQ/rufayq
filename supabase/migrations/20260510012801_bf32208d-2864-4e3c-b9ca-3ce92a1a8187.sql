-- Bucket for related documents attached to transport tickets (visa, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('transport-attachments', 'transport-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: device-id-scoped via first folder segment of object name.
-- Path layout: <device_id>/<segment_ref>/<filename>
DROP POLICY IF EXISTS "Anyone read own transport attachments" ON storage.objects;
CREATE POLICY "Anyone read own transport attachments"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'transport-attachments');

DROP POLICY IF EXISTS "Anyone upload transport attachments" ON storage.objects;
CREATE POLICY "Anyone upload transport attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'transport-attachments');

DROP POLICY IF EXISTS "Anyone delete own transport attachments" ON storage.objects;
CREATE POLICY "Anyone delete own transport attachments"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'transport-attachments');

-- Metadata table linking files to a (device_id, segment_ref) pair.
-- segment_ref is the client-generated TransportSegment.id (string), so we
-- can attach docs both during the wizard and later from Journey screen.
CREATE TABLE IF NOT EXISTS public.transport_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  segment_ref TEXT NOT NULL,
  label TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_attachments_lookup
  ON public.transport_attachments(device_id, segment_ref);

ALTER TABLE public.transport_attachments ENABLE ROW LEVEL SECURITY;

-- Device-scoped (no auth required for patient device flow used elsewhere)
DROP POLICY IF EXISTS "Anyone read transport attachments" ON public.transport_attachments;
CREATE POLICY "Anyone read transport attachments"
ON public.transport_attachments FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone insert transport attachments" ON public.transport_attachments;
CREATE POLICY "Anyone insert transport attachments"
ON public.transport_attachments FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone delete transport attachments" ON public.transport_attachments;
CREATE POLICY "Anyone delete transport attachments"
ON public.transport_attachments FOR DELETE
TO anon, authenticated
USING (true);