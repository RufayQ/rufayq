
-- =====================================================================
-- Phase 4 Area 3.4 — IP / Day-Case admissions + Discharge workflow
-- =====================================================================

-- Enums
DO $$ BEGIN CREATE TYPE public.rcm_admission_type AS ENUM ('day_case','elective','emergency','observation','transfer_in'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_admission_status AS ENUM ('admitted','in_treatment','discharge_advised','discharge_ordered','service_reconciled','financial_discharged','discharged','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_discharge_stage AS ENUM ('discharge_advice','discharge_order','service_reconciliation','financial_discharge','left_facility'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_los_ext_status AS ENUM ('draft','submitted','approved','partial','rejected','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_import_kind AS ENUM ('contract','policy','price_list','package','class','network','tariff'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_import_status AS ENUM ('uploaded','parsing','ready_for_review','mapped','applied','failed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_activation_kind AS ENUM ('policy','class','network'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- Admissions
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rcm_admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES public.rcm_visits(id) ON DELETE SET NULL,
  patient_device_id TEXT,
  patient_profile_id UUID,
  admission_no TEXT UNIQUE,
  admission_type public.rcm_admission_type NOT NULL DEFAULT 'elective',
  status public.rcm_admission_status NOT NULL DEFAULT 'admitted',
  package_id UUID REFERENCES public.rcm_packages(id) ON DELETE SET NULL,
  authorization_id UUID REFERENCES public.rcm_authorization_requests(id) ON DELETE SET NULL,
  payer_id UUID REFERENCES public.rcm_payers(id) ON DELETE SET NULL,
  policy_id UUID REFERENCES public.rcm_policies(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.rcm_classes(id) ON DELETE SET NULL,
  attending_name TEXT,
  specialty TEXT,
  ward TEXT,
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  planned_los_days INT NOT NULL DEFAULT 1,
  actual_los_days INT,
  expected_discharge_at TIMESTAMPTZ,
  discharge_advised_at TIMESTAMPTZ,
  discharge_ordered_at TIMESTAMPTZ,
  service_reconciled_at TIMESTAMPTZ,
  financial_discharged_at TIMESTAMPTZ,
  discharged_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admissions_org ON public.rcm_admissions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_admissions_dev ON public.rcm_admissions(patient_device_id);

ALTER TABLE public.rcm_admissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage admissions" ON public.rcm_admissions;
CREATE POLICY "Admins manage admissions" ON public.rcm_admissions FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Org members manage admissions" ON public.rcm_admissions;
CREATE POLICY "Org members manage admissions" ON public.rcm_admissions FOR ALL TO authenticated USING (is_org_member(auth.uid(), organization_id)) WITH CHECK (is_org_member(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Patient reads own admissions" ON public.rcm_admissions;
CREATE POLICY "Patient reads own admissions" ON public.rcm_admissions FOR SELECT TO public USING (patient_device_id IS NOT NULL AND patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

CREATE OR REPLACE FUNCTION public.rcm_assign_admission_no()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.admission_no IS NULL OR NEW.admission_no = '' THEN
    NEW.admission_no := 'ADM-' || to_char(now(),'YYMMDD') || '-' || LPAD(FLOOR(RANDOM()*100000)::TEXT,5,'0');
  END IF;
  IF NEW.expected_discharge_at IS NULL AND NEW.planned_los_days IS NOT NULL THEN
    NEW.expected_discharge_at := NEW.admitted_at + make_interval(days => NEW.planned_los_days);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_rcm_admission_no ON public.rcm_admissions;
CREATE TRIGGER trg_rcm_admission_no BEFORE INSERT ON public.rcm_admissions FOR EACH ROW EXECUTE FUNCTION public.rcm_assign_admission_no();
DROP TRIGGER IF EXISTS trg_rcm_admission_uat ON public.rcm_admissions;
CREATE TRIGGER trg_rcm_admission_uat BEFORE UPDATE ON public.rcm_admissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- Bed assignments
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rcm_bed_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES public.rcm_admissions(id) ON DELETE CASCADE,
  ward TEXT,
  room_no TEXT,
  bed_no TEXT,
  room_type public.rcm_room_type,
  daily_rate NUMERIC(12,2) DEFAULT 0,
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_beds_adm ON public.rcm_bed_assignments(admission_id);
ALTER TABLE public.rcm_bed_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage beds" ON public.rcm_bed_assignments;
CREATE POLICY "Admins manage beds" ON public.rcm_bed_assignments FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Org members manage beds" ON public.rcm_bed_assignments;
CREATE POLICY "Org members manage beds" ON public.rcm_bed_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_admissions a WHERE a.id = rcm_bed_assignments.admission_id AND is_org_member(auth.uid(), a.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_admissions a WHERE a.id = rcm_bed_assignments.admission_id AND is_org_member(auth.uid(), a.organization_id)));

-- =====================================================================
-- LOS extensions
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rcm_los_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES public.rcm_admissions(id) ON DELETE CASCADE,
  authorization_id UUID REFERENCES public.rcm_authorization_requests(id) ON DELETE SET NULL,
  requested_extra_days INT NOT NULL,
  approved_extra_days INT,
  status public.rcm_los_ext_status NOT NULL DEFAULT 'draft',
  clinical_justification TEXT,
  decision_notes TEXT,
  requested_by UUID,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rcm_los_extensions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage los_ext" ON public.rcm_los_extensions;
CREATE POLICY "Admins manage los_ext" ON public.rcm_los_extensions FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Org members manage los_ext" ON public.rcm_los_extensions;
CREATE POLICY "Org members manage los_ext" ON public.rcm_los_extensions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_admissions a WHERE a.id = rcm_los_extensions.admission_id AND is_org_member(auth.uid(), a.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_admissions a WHERE a.id = rcm_los_extensions.admission_id AND is_org_member(auth.uid(), a.organization_id)));
DROP TRIGGER IF EXISTS trg_los_ext_uat ON public.rcm_los_extensions;
CREATE TRIGGER trg_los_ext_uat BEFORE UPDATE ON public.rcm_los_extensions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- Discharge steps log
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rcm_discharge_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES public.rcm_admissions(id) ON DELETE CASCADE,
  stage public.rcm_discharge_stage NOT NULL,
  actor_id UUID,
  actor_role TEXT,
  notes TEXT,
  payload JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dsteps_adm ON public.rcm_discharge_steps(admission_id, occurred_at DESC);
ALTER TABLE public.rcm_discharge_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage dsteps" ON public.rcm_discharge_steps;
CREATE POLICY "Admins manage dsteps" ON public.rcm_discharge_steps FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Org members manage dsteps" ON public.rcm_discharge_steps;
CREATE POLICY "Org members manage dsteps" ON public.rcm_discharge_steps FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_admissions a WHERE a.id = rcm_discharge_steps.admission_id AND is_org_member(auth.uid(), a.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_admissions a WHERE a.id = rcm_discharge_steps.admission_id AND is_org_member(auth.uid(), a.organization_id)));
DROP POLICY IF EXISTS "Patient reads own dsteps" ON public.rcm_discharge_steps;
CREATE POLICY "Patient reads own dsteps" ON public.rcm_discharge_steps FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.rcm_admissions a WHERE a.id = rcm_discharge_steps.admission_id AND a.patient_device_id IS NOT NULL AND a.patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')));

-- =====================================================================
-- Notify patient on discharge stage transitions
-- =====================================================================
CREATE OR REPLACE FUNCTION public.notify_patient_of_admission_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _t TEXT; _t_ar TEXT; _org_name TEXT;
BEGIN
  IF NEW.patient_device_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT name INTO _org_name FROM public.organizations WHERE id = NEW.organization_id;
    _t := CASE NEW.status
      WHEN 'admitted' THEN 'You have been admitted'
      WHEN 'discharge_advised' THEN 'Discharge advised'
      WHEN 'discharge_ordered' THEN 'Discharge ordered'
      WHEN 'service_reconciled' THEN 'Services reconciled'
      WHEN 'financial_discharged' THEN 'Financially cleared for discharge'
      WHEN 'discharged' THEN 'Discharged'
      ELSE 'Admission update' END;
    _t_ar := CASE NEW.status
      WHEN 'admitted' THEN 'تم تنويمك'
      WHEN 'discharge_advised' THEN 'نُصح بالخروج'
      WHEN 'discharge_ordered' THEN 'صدر أمر الخروج'
      WHEN 'service_reconciled' THEN 'تمت مطابقة الخدمات'
      WHEN 'financial_discharged' THEN 'تم التخليص المالي للخروج'
      WHEN 'discharged' THEN 'تم الخروج'
      ELSE 'تحديث التنويم' END;
    INSERT INTO public.patient_notifications(patient_device_id, organization_id, kind, title, title_ar, body, body_ar, link)
    VALUES (NEW.patient_device_id, NEW.organization_id, 'admission', _t, _t_ar,
      COALESCE(_org_name,'Provider') || ' · admission ' || COALESCE(NEW.admission_no,'-'),
      COALESCE(_org_name,'مزوّد') || ' · تنويم ' || COALESCE(NEW.admission_no,'-'),
      '/profile?tab=rcm');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_admission_notify ON public.rcm_admissions;
CREATE TRIGGER trg_admission_notify AFTER INSERT OR UPDATE ON public.rcm_admissions FOR EACH ROW EXECUTE FUNCTION public.notify_patient_of_admission_status();

-- =====================================================================
-- Discharge advance helper RPC (records stage + flips status)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.rcm_advance_discharge(_admission_id UUID, _stage public.rcm_discharge_stage, _notes TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _org UUID;
BEGIN
  SELECT organization_id INTO _org FROM public.rcm_admissions WHERE id = _admission_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'Admission not found'; END IF;
  IF NOT (has_role(auth.uid(),'admin') OR is_org_member(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.rcm_discharge_steps(admission_id, stage, actor_id, notes) VALUES (_admission_id, _stage, auth.uid(), _notes);
  UPDATE public.rcm_admissions SET
    status = CASE _stage
      WHEN 'discharge_advice' THEN 'discharge_advised'::public.rcm_admission_status
      WHEN 'discharge_order' THEN 'discharge_ordered'::public.rcm_admission_status
      WHEN 'service_reconciliation' THEN 'service_reconciled'::public.rcm_admission_status
      WHEN 'financial_discharge' THEN 'financial_discharged'::public.rcm_admission_status
      WHEN 'left_facility' THEN 'discharged'::public.rcm_admission_status
      ELSE status END,
    discharge_advised_at = COALESCE(discharge_advised_at, CASE WHEN _stage='discharge_advice' THEN now() END),
    discharge_ordered_at = COALESCE(discharge_ordered_at, CASE WHEN _stage='discharge_order' THEN now() END),
    service_reconciled_at = COALESCE(service_reconciled_at, CASE WHEN _stage='service_reconciliation' THEN now() END),
    financial_discharged_at = COALESCE(financial_discharged_at, CASE WHEN _stage='financial_discharge' THEN now() END),
    discharged_at = COALESCE(discharged_at, CASE WHEN _stage='left_facility' THEN now() END),
    actual_los_days = CASE WHEN _stage='left_facility' THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - admitted_at))/86400)::int) ELSE actual_los_days END,
    updated_at = now()
    WHERE id = _admission_id;
END $$;

-- =====================================================================
-- Smart import staging (Admin)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rcm_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.rcm_import_kind NOT NULL,
  status public.rcm_import_status NOT NULL DEFAULT 'uploaded',
  source_filename TEXT,
  source_url TEXT,
  source_mime TEXT,
  payer_id UUID REFERENCES public.rcm_payers(id) ON DELETE SET NULL,
  policy_id UUID REFERENCES public.rcm_policies(id) ON DELETE SET NULL,
  price_list_id UUID REFERENCES public.rcm_price_lists(id) ON DELETE SET NULL,
  parsed_payload JSONB,
  ai_summary TEXT,
  error_message TEXT,
  created_by UUID,
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rcm_import_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage import_jobs" ON public.rcm_import_jobs;
CREATE POLICY "Admins manage import_jobs" ON public.rcm_import_jobs FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_import_jobs_uat ON public.rcm_import_jobs;
CREATE TRIGGER trg_import_jobs_uat BEFORE UPDATE ON public.rcm_import_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.rcm_import_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.rcm_import_jobs(id) ON DELETE CASCADE,
  raw_row JSONB NOT NULL,
  proposed JSONB,
  target_table TEXT,
  target_id UUID,
  confidence NUMERIC(5,2),
  approved BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_imap_job ON public.rcm_import_mappings(job_id);
ALTER TABLE public.rcm_import_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage import_mappings" ON public.rcm_import_mappings;
CREATE POLICY "Admins manage import_mappings" ON public.rcm_import_mappings FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- =====================================================================
-- Activation worklist generalisation
-- =====================================================================
DO $$ BEGIN
  ALTER TABLE public.rcm_policy_activation_requests ADD COLUMN IF NOT EXISTS kind public.rcm_activation_kind NOT NULL DEFAULT 'policy';
  ALTER TABLE public.rcm_policy_activation_requests ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.rcm_classes(id) ON DELETE CASCADE;
  ALTER TABLE public.rcm_policy_activation_requests ADD COLUMN IF NOT EXISTS network_id UUID REFERENCES public.rcm_networks(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN
  CREATE TABLE public.rcm_policy_activation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind public.rcm_activation_kind NOT NULL DEFAULT 'policy',
    policy_id UUID REFERENCES public.rcm_policies(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.rcm_classes(id) ON DELETE CASCADE,
    network_id UUID REFERENCES public.rcm_networks(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_by UUID,
    decided_by UUID,
    decision_notes TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE public.rcm_policy_activation_requests ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins manage activations" ON public.rcm_policy_activation_requests FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
  CREATE POLICY "Org members read activations" ON public.rcm_policy_activation_requests FOR SELECT TO authenticated USING (organization_id IS NULL OR is_org_member(auth.uid(), organization_id));
  CREATE POLICY "Org members request activation" ON public.rcm_policy_activation_requests FOR INSERT TO authenticated WITH CHECK (organization_id IS NULL OR is_org_member(auth.uid(), organization_id));
END $$;
