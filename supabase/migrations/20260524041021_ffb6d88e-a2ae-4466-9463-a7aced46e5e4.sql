DROP POLICY IF EXISTS "Org members insert memberships" ON public.rcm_payer_memberships;

CREATE POLICY "Org members insert memberships"
ON public.rcm_payer_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.provider_patients pp
    JOIN public.provider_members pm ON pm.organization_id = pp.organization_id
    WHERE pp.patient_device_id = rcm_payer_memberships.patient_device_id
      AND pm.user_id = auth.uid()
      AND pm.is_active = true
  )
);