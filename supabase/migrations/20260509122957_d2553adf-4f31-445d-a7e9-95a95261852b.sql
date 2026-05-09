
-- ─── consent_requests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  patient_device_id TEXT NOT NULL,
  requested_sections TEXT[] NOT NULL
    DEFAULT ARRAY['profile','medications','lab_results','imaging','discharge_summaries','appointments','consultations']::text[],
  approved_sections TEXT[],
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','denied','partial')),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_requests_org ON public.consent_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_consent_requests_device ON public.consent_requests(patient_device_id);
CREATE INDEX IF NOT EXISTS idx_consent_requests_requester ON public.consent_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_consent_requests_status ON public.consent_requests(status);

ALTER TABLE public.consent_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members create consent requests"
  ON public.consent_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND requested_by = auth.uid());

CREATE POLICY "Org members view their org consent requests"
  ON public.consent_requests FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Patient views consent requests targeting them"
  ON public.consent_requests FOR SELECT
  USING (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

CREATE POLICY "Patient updates consent request decision"
  ON public.consent_requests FOR UPDATE
  USING (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
         AND status = 'pending')
  WITH CHECK (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

CREATE POLICY "Admins manage all consent requests"
  ON public.consent_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_consent_requests_updated
  BEFORE UPDATE ON public.consent_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify patient on creation
CREATE OR REPLACE FUNCTION public.notify_patient_of_consent_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org_name TEXT;
BEGIN
  SELECT name INTO _org_name FROM public.organizations WHERE id = NEW.organization_id;
  INSERT INTO public.patient_notifications(
    patient_device_id, organization_id, kind, title, title_ar, body, body_ar, link
  ) VALUES (
    NEW.patient_device_id, NEW.organization_id, 'consent_request',
    'EMR access request',
    'طلب وصول للسجل الطبي',
    COALESCE(_org_name,'A provider') || ' is requesting access to ' || array_length(NEW.requested_sections,1) || ' section(s) of your medical record',
    COALESCE(_org_name,'مزوّد') || ' يطلب الوصول إلى ' || array_length(NEW.requested_sections,1) || ' قسم من سجلك الطبي',
    '/profile?tab=consents'
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_patient_of_consent_request
  AFTER INSERT ON public.consent_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_patient_of_consent_request();

-- On approval: insert per-section consents and notify
CREATE OR REPLACE FUNCTION public.apply_consent_request_decision()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _section TEXT; _approved TEXT[];
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status IN ('approved','partial') THEN
    _approved := COALESCE(NEW.approved_sections, NEW.requested_sections);
    FOREACH _section IN ARRAY _approved LOOP
      BEGIN
        INSERT INTO public.patient_consents(
          patient_device_id, organization_id, section, granted, granted_at
        ) VALUES (
          NEW.patient_device_id, NEW.organization_id, _section::consent_section, true, now()
        )
        ON CONFLICT (patient_device_id, organization_id, section)
        DO UPDATE SET granted = true, revoked_at = NULL, granted_at = now(), updated_at = now();
      EXCEPTION WHEN invalid_text_representation THEN
        -- skip sections that don't map to consent_section enum
        NULL;
      END;
    END LOOP;
  END IF;
  IF NEW.reviewed_at IS NULL THEN NEW.reviewed_at := now(); END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_apply_consent_request_decision
  BEFORE UPDATE ON public.consent_requests
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.apply_consent_request_decision();

-- ─── provider_emr_access_log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.provider_emr_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  accessed_by UUID NOT NULL,
  patient_device_id TEXT NOT NULL,
  granted_sections TEXT[] NOT NULL DEFAULT '{}',
  denied_sections TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emr_access_org ON public.provider_emr_access_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_emr_access_device ON public.provider_emr_access_log(patient_device_id);

ALTER TABLE public.provider_emr_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view their own access log"
  ON public.provider_emr_access_log FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

-- The edge function uses service_role; no insert policy needed.
