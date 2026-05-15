
-- 1) Schema additions ───────────────────────────────────────────────────────
ALTER TABLE public.transport_attachments
  ADD COLUMN IF NOT EXISTS user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS ticket_id uuid NULL,
  ADD COLUMN IF NOT EXISTS source_document_id uuid NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- updated_at trigger (reuse the project-wide helper)
DROP TRIGGER IF EXISTS set_updated_at ON public.transport_attachments;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.transport_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Indexes ───────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_transport_attachments_lookup;

CREATE INDEX IF NOT EXISTS idx_transport_attachments_user_segment
  ON public.transport_attachments(user_id, segment_ref)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transport_attachments_ticket
  ON public.transport_attachments(ticket_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transport_attachments_device_segment
  ON public.transport_attachments(device_id, segment_ref)
  WHERE deleted_at IS NULL;

-- 3) RLS — replace device-only with user-OR-device ────────────────────────
DROP POLICY IF EXISTS "Device can read own transport attachments"   ON public.transport_attachments;
DROP POLICY IF EXISTS "Device can insert own transport attachments" ON public.transport_attachments;
DROP POLICY IF EXISTS "Device can update own transport attachments" ON public.transport_attachments;
DROP POLICY IF EXISTS "Device can delete own transport attachments" ON public.transport_attachments;

CREATE POLICY "Owner or device can read transport attachments"
  ON public.transport_attachments
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR device_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
  );

CREATE POLICY "Owner or device can insert transport attachments"
  ON public.transport_attachments
  FOR INSERT
  WITH CHECK (
    -- Signed-in callers must claim themselves; guests must match the device header.
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND device_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), ''))
  );

CREATE POLICY "Owner or device can update transport attachments"
  ON public.transport_attachments
  FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR device_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL))
    OR device_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
  );

CREATE POLICY "Owner or device can delete transport attachments"
  ON public.transport_attachments
  FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR device_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
  );

-- 4) Storage policies on transport-attachments bucket ──────────────────────
DROP POLICY IF EXISTS "Device can read own transport-attachments files"   ON storage.objects;
DROP POLICY IF EXISTS "Device can upload own transport-attachments files" ON storage.objects;
DROP POLICY IF EXISTS "Device can delete own transport-attachments files" ON storage.objects;

CREATE POLICY "Owner or device can read transport-attachments files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'transport-attachments'
    AND (
      -- New layout: user/<auth.uid()>/...
      (auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = 'user'
        AND (storage.foldername(name))[2] = auth.uid()::text)
      -- Legacy/guest layout: <device_id>/...
      OR (storage.foldername(name))[1] = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
    )
  );

CREATE POLICY "Owner or device can upload transport-attachments files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'transport-attachments'
    AND (
      (auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = 'user'
        AND (storage.foldername(name))[2] = auth.uid()::text)
      OR (storage.foldername(name))[1] = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
    )
  );

CREATE POLICY "Owner or device can update transport-attachments files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'transport-attachments'
    AND (
      (auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = 'user'
        AND (storage.foldername(name))[2] = auth.uid()::text)
      OR (storage.foldername(name))[1] = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
    )
  );

CREATE POLICY "Owner or device can delete transport-attachments files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'transport-attachments'
    AND (
      (auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = 'user'
        AND (storage.foldername(name))[2] = auth.uid()::text)
      OR (storage.foldername(name))[1] = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
    )
  );

-- 5) One-time best-effort backfill ─────────────────────────────────────────
-- Backfill ticket_id from transport_tickets.pending_segment_ref or first segment id.
UPDATE public.transport_attachments a
SET ticket_id = t.id
FROM public.transport_tickets t
WHERE a.ticket_id IS NULL
  AND a.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND a.device_id = t.device_id
  AND (
    a.segment_ref = t.pending_segment_ref
    OR EXISTS (
      SELECT 1 FROM public.transport_flight_segments s
      WHERE s.ticket_id = t.id
        AND s.id::text = a.segment_ref
    )
  );

-- Backfill user_id from the owning ticket.
UPDATE public.transport_attachments a
SET user_id = t.user_id
FROM public.transport_tickets t
WHERE a.user_id IS NULL
  AND a.ticket_id = t.id
  AND t.user_id IS NOT NULL;
