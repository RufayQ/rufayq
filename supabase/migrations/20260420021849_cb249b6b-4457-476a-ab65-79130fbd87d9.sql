-- ============================================================
-- SECURITY HARDENING: provider-docs bucket + patient_notifications
-- ============================================================

-- A + E: Make provider-docs bucket PRIVATE (no public reads, no listing)
UPDATE storage.buckets SET public = false WHERE id = 'provider-docs';

-- Drop the over-permissive public read policy
DROP POLICY IF EXISTS "Public read provider docs" ON storage.objects;

-- Keep INSERT for anonymous applicants (during signup, before auth)
-- but scope tightly to the applications/ subfolder
DROP POLICY IF EXISTS "Anyone upload provider docs to applications/" ON storage.objects;
CREATE POLICY "Anon upload to provider-docs applications folder"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'provider-docs'
  AND (storage.foldername(name))[1] = 'applications'
);

-- Admins can read (for review) — replaces public read
CREATE POLICY "Admins read provider docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-docs'
  AND public.has_role(auth.uid(), 'admin')
);

-- D: Admins can UPDATE provider docs (file replacement is gated)
CREATE POLICY "Admins update provider docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'provider-docs'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'provider-docs'
  AND public.has_role(auth.uid(), 'admin')
);

-- (existing "Admins delete provider docs" policy is kept as-is)

-- ============================================================
-- B: Tighten patient_notifications so authenticated users
-- without org membership cannot subscribe to all events.
-- The existing public-role policy used a request header which is
-- forwarded into the JWT context for Realtime — but authenticated
-- users were getting an org-member SELECT that didn't filter by
-- a real org link for users with NO membership rows.
-- We re-create the policies to make the auth path strict.
-- ============================================================

DROP POLICY IF EXISTS "Patient reads own notifications" ON public.patient_notifications;
DROP POLICY IF EXISTS "Patient updates own notifications" ON public.patient_notifications;
DROP POLICY IF EXISTS "Org members view sent notifications" ON public.patient_notifications;
DROP POLICY IF EXISTS "Org members create notifications" ON public.patient_notifications;

-- Patient (anon, device-id based): must have a non-empty matching header
CREATE POLICY "Patient reads own notifications"
ON public.patient_notifications FOR SELECT
TO public
USING (
  patient_device_id IS NOT NULL
  AND patient_device_id <> ''
  AND patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
);

CREATE POLICY "Patient updates own notifications"
ON public.patient_notifications FOR UPDATE
TO public
USING (
  patient_device_id IS NOT NULL
  AND patient_device_id <> ''
  AND patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
)
WITH CHECK (
  patient_device_id IS NOT NULL
  AND patient_device_id <> ''
  AND patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
);

-- Org staff: must be active member of the specific organization
CREATE POLICY "Org members view sent notifications"
ON public.patient_notifications FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "Org members create notifications"
ON public.patient_notifications FOR INSERT
TO authenticated
WITH CHECK (
  (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
  OR public.has_role(auth.uid(), 'admin')
);

-- Admins manage all
CREATE POLICY "Admins manage all notifications"
ON public.patient_notifications FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));