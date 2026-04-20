
-- 1) profiles: device-scoped SELECT
DROP POLICY IF EXISTS "Device reads own profile" ON public.profiles;
CREATE POLICY "Device reads own profile"
  ON public.profiles FOR SELECT
  USING (
    device_id IS NOT NULL
    AND device_id <> ''
    AND device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );

-- 2) manual_otp_codes: explicit restrictive deny for non-admins on SELECT
DROP POLICY IF EXISTS "Deny non-admin reads on otp codes" ON public.manual_otp_codes;
CREATE POLICY "Deny non-admin reads on otp codes"
  ON public.manual_otp_codes
  AS RESTRICTIVE
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) rcm_advance_discharge: enforce org membership
CREATE OR REPLACE FUNCTION public.rcm_advance_discharge(_admission_id uuid, _stage rcm_discharge_stage, _notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.rcm_discharge_signoffs%ROWTYPE;
  _org UUID;
BEGIN
  SELECT organization_id INTO _org FROM public.rcm_admissions WHERE id = _admission_id;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'Admission not found';
  END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.is_org_member(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'Not authorized to advance discharge for this admission';
  END IF;

  IF _stage = 'financial_discharge'::rcm_discharge_stage THEN
    SELECT * INTO s FROM public.rcm_discharge_signoffs WHERE admission_id = _admission_id;
    IF s.id IS NULL OR s.nursing_signed_at IS NULL OR s.pharmacy_signed_at IS NULL OR s.physician_signed_at IS NULL THEN
      RAISE EXCEPTION 'Medical Discharge requires Nursing, Pharmacy and Physician sign-off before Financial Discharge';
    END IF;
  END IF;

  INSERT INTO public.rcm_discharge_steps(admission_id, stage, notes, actor_id)
  VALUES (_admission_id, _stage, _notes, auth.uid());

  UPDATE public.rcm_admissions
  SET
    discharge_advised_at    = CASE WHEN _stage = 'discharge_advice'       THEN COALESCE(discharge_advised_at, now())    ELSE discharge_advised_at END,
    discharge_ordered_at    = CASE WHEN _stage = 'discharge_order'        THEN COALESCE(discharge_ordered_at, now())    ELSE discharge_ordered_at END,
    service_reconciled_at   = CASE WHEN _stage = 'service_reconciliation' THEN COALESCE(service_reconciled_at, now())   ELSE service_reconciled_at END,
    financial_discharged_at = CASE WHEN _stage = 'financial_discharge'    THEN COALESCE(financial_discharged_at, now()) ELSE financial_discharged_at END,
    discharged_at           = CASE WHEN _stage = 'left_facility'          THEN COALESCE(discharged_at, now())           ELSE discharged_at END,
    status = CASE _stage
      WHEN 'discharge_advice'       THEN 'discharge_advised'::rcm_admission_status
      WHEN 'discharge_order'        THEN 'discharge_ordered'::rcm_admission_status
      WHEN 'service_reconciliation' THEN 'service_reconciled'::rcm_admission_status
      WHEN 'financial_discharge'    THEN 'financial_discharged'::rcm_admission_status
      WHEN 'left_facility'          THEN 'discharged'::rcm_admission_status
      ELSE status
    END,
    updated_at = now()
  WHERE id = _admission_id;
END;
$function$;

-- 4) Realtime: ensure RLS filters apply to publication.
-- patient_notifications already has device-scoped RLS; force replica identity FULL
-- so realtime can apply RLS row filters reliably for both INSERT and UPDATE events.
ALTER TABLE public.patient_notifications REPLICA IDENTITY FULL;
