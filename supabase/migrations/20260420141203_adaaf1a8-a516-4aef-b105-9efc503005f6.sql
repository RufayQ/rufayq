
-- 1. rcm_payer_memberships: scope provider read to patients linked to the provider's org
DROP POLICY IF EXISTS "Org members read memberships" ON public.rcm_payer_memberships;
CREATE POLICY "Org members read memberships for their patients"
ON public.rcm_payer_memberships
FOR SELECT
TO authenticated
USING (
  patient_device_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.provider_patients pp
    WHERE pp.patient_device_id = rcm_payer_memberships.patient_device_id
      AND public.is_org_member(auth.uid(), pp.organization_id)
  )
);

-- 2. provider-docs: block anonymous uploads
DROP POLICY IF EXISTS "Anon upload to provider-docs applications folder" ON storage.objects;
CREATE POLICY "Authenticated upload to provider-docs applications folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-docs'
  AND (storage.foldername(name))[1] = 'applications'
);

-- 3. Realtime channel authorization (device-scoped topics: pn:<id>, pf:<id>)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Device-scoped realtime topic read" ON realtime.messages;
DROP POLICY IF EXISTS "Device-scoped realtime topic write" ON realtime.messages;

CREATE POLICY "Device-scoped realtime topic read"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (
  realtime.topic() IN (
    'pn:' || ((current_setting('request.headers', true))::json ->> 'x-device-id'),
    'pf:' || ((current_setting('request.headers', true))::json ->> 'x-device-id')
  )
);

CREATE POLICY "Device-scoped realtime topic write"
ON realtime.messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  realtime.topic() IN (
    'pn:' || ((current_setting('request.headers', true))::json ->> 'x-device-id'),
    'pf:' || ((current_setting('request.headers', true))::json ->> 'x-device-id')
  )
);
