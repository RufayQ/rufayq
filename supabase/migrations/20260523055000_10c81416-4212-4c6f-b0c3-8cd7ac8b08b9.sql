
DROP POLICY IF EXISTS "Anyone submits provider application" ON public.provider_applications;
CREATE POLICY "Anyone submits provider application"
ON public.provider_applications
FOR INSERT
WITH CHECK (
  status = 'pending'::text
  AND admin_feedback IS NULL
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND organization_id IS NULL
);

DROP POLICY IF EXISTS "Public submits assistance request" ON public.verification_assistance_requests;
CREATE POLICY "Public submits assistance request"
ON public.verification_assistance_requests
FOR INSERT
WITH CHECK (
  status = 'pending'::verification_assist_status
  AND handled_by IS NULL
  AND handled_at IS NULL
  AND resolution_notes IS NULL
);
