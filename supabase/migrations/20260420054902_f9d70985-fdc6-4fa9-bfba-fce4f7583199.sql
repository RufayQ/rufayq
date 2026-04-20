-- 1. Add iqama_number to profiles (Saudi residency permit)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iqama_number TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_saudi_id ON public.profiles(saudi_id) WHERE saudi_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_passport ON public.profiles(passport_number) WHERE passport_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_iqama ON public.profiles(iqama_number) WHERE iqama_number IS NOT NULL;

-- 2. Enums for claim status and consent sections
DO $$ BEGIN
  CREATE TYPE public.claim_status AS ENUM ('pending_admin','pending_patient','approved','rejected','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consent_section AS ENUM ('records','labs','rads','meds','appointments','journey','rcm');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. patient_claims table
CREATE TABLE IF NOT EXISTS public.patient_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  -- patient identifiers (provider may not yet know the device_id)
  search_type TEXT NOT NULL CHECK (search_type IN ('saudi_id','passport','iqama')),
  search_value TEXT NOT NULL,
  matched_profile_id UUID,
  matched_device_id TEXT,
  reason TEXT,
  status public.claim_status NOT NULL DEFAULT 'pending_admin',
  admin_decision_at TIMESTAMPTZ,
  admin_decision_by UUID,
  admin_notes TEXT,
  patient_decision_at TIMESTAMPTZ,
  patient_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_claims_org ON public.patient_claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_patient_claims_device ON public.patient_claims(matched_device_id);
CREATE INDEX IF NOT EXISTS idx_patient_claims_status ON public.patient_claims(status);

ALTER TABLE public.patient_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members create claims for their org"
ON public.patient_claims FOR INSERT TO authenticated
WITH CHECK (is_org_member(auth.uid(), organization_id) AND requested_by = auth.uid());

CREATE POLICY "Org members view their org claims"
ON public.patient_claims FOR SELECT TO authenticated
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Patient views claims targeting them"
ON public.patient_claims FOR SELECT TO public
USING (matched_device_id IS NOT NULL
       AND matched_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

CREATE POLICY "Patient updates own claim decision"
ON public.patient_claims FOR UPDATE TO public
USING (matched_device_id IS NOT NULL
       AND matched_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
       AND status = 'pending_patient')
WITH CHECK (matched_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

CREATE POLICY "Admins manage all claims"
ON public.patient_claims FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'))
WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_patient_claims_updated
BEFORE UPDATE ON public.patient_claims
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. patient_consents table (per-section grants per provider)
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_device_id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.patient_claims(id) ON DELETE SET NULL,
  section public.consent_section NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_device_id, organization_id, section)
);

CREATE INDEX IF NOT EXISTS idx_consents_lookup ON public.patient_consents(patient_device_id, organization_id, section) WHERE granted = true;

ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient manages own consents"
ON public.patient_consents FOR ALL TO public
USING (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
WITH CHECK (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

CREATE POLICY "Org members view consents granted to them"
ON public.patient_consents FOR SELECT TO authenticated
USING (is_org_member(auth.uid(), organization_id) OR has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_patient_consents_updated
BEFORE UPDATE ON public.patient_consents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper function for future RLS on records/labs/etc.
CREATE OR REPLACE FUNCTION public.provider_has_consent(_org_id UUID, _device_id TEXT, _section public.consent_section)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_consents
    WHERE organization_id = _org_id
      AND patient_device_id = _device_id
      AND section = _section
      AND granted = true
      AND revoked_at IS NULL
  );
$$;

-- 6. Audit claim status changes
CREATE OR REPLACE FUNCTION public.audit_patient_claim_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('patient_claim_created','patient_claim',NEW.id::text,
      jsonb_build_object('org',NEW.organization_id,'search_type',NEW.search_type));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_audit_event('patient_claim_status_changed','patient_claim',NEW.id::text,
      jsonb_build_object('from',OLD.status,'to',NEW.status,'org',NEW.organization_id));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_audit_patient_claims
AFTER INSERT OR UPDATE ON public.patient_claims
FOR EACH ROW EXECUTE FUNCTION public.audit_patient_claim_change();

-- 7. Notify patient when claim moves to pending_patient
CREATE OR REPLACE FUNCTION public.notify_patient_of_claim()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org_name TEXT;
BEGIN
  IF NEW.status = 'pending_patient'
     AND (OLD.status IS DISTINCT FROM 'pending_patient')
     AND NEW.matched_device_id IS NOT NULL THEN
    SELECT name INTO _org_name FROM public.organizations WHERE id = NEW.organization_id;
    INSERT INTO public.patient_notifications(patient_device_id, organization_id, kind, title, title_ar, body, body_ar, link)
    VALUES (NEW.matched_device_id, NEW.organization_id, 'claim_request',
      'Provider access request',
      'طلب وصول من مزوّد',
      COALESCE(_org_name,'A provider') || ' is requesting access to your medical data',
      COALESCE(_org_name,'مزوّد') || ' يطلب الوصول إلى بياناتك الطبية',
      '/profile?tab=consents');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_patient_of_claim
AFTER UPDATE ON public.patient_claims
FOR EACH ROW EXECUTE FUNCTION public.notify_patient_of_claim();