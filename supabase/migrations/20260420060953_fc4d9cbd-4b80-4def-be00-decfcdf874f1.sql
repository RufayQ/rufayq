-- =============================================================
-- NPHIES Phase 4 — Area 3.1: Master & Contract Management
-- =============================================================

-- Reuse existing trigger function public.update_updated_at_column

-- ============= Hierarchy: TPA -> Payer -> Policy -> Class =============

CREATE TABLE public.rcm_tpas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  code text UNIQUE,
  internal_serial text,
  vat_no text,
  contact_email text,
  contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.rcm_payers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tpa_id uuid REFERENCES public.rcm_tpas(id) ON DELETE SET NULL,
  name text NOT NULL,
  name_ar text,
  code text UNIQUE,
  internal_serial text,
  vat_no text,
  che_no text,
  contract_expiry date,
  contact_email text,
  contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.rcm_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id uuid NOT NULL REFERENCES public.rcm_payers(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  policy_no text NOT NULL,
  internal_serial text,
  effective_from date,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (payer_id, policy_no)
);

CREATE TYPE public.rcm_deductible_type AS ENUM ('percentage','amount');
CREATE TYPE public.rcm_room_type AS ENUM ('ward','semi_private','private','vip','suite','icu','ccu','hdu','nicu','picu');

CREATE TABLE public.rcm_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.rcm_policies(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  internal_serial text,
  deductible_type public.rcm_deductible_type,
  deductible_value numeric(12,2) DEFAULT 0,
  before_discount boolean NOT NULL DEFAULT true,
  consultation_rule numeric(12,2),
  services_rule numeric(12,2),
  medications_rule numeric(12,2),
  maximum_limit numeric(14,2),
  approval_limit numeric(14,2),
  room_type public.rcm_room_type,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (policy_id, name)
);

CREATE TABLE public.rcm_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id uuid REFERENCES public.rcm_payers(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  code text,
  deductible_value numeric(12,2),
  deductible_type public.rcm_deductible_type,
  maximum_limit numeric(14,2),
  approval_limit numeric(14,2),
  room_type public.rcm_room_type,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.rcm_class_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.rcm_classes(id) ON DELETE CASCADE,
  network_id uuid NOT NULL REFERENCES public.rcm_networks(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, network_id)
);

-- ============= Price Lists & Packages =============

CREATE TABLE public.rcm_price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  currency text NOT NULL DEFAULT 'SAR',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  payer_id uuid REFERENCES public.rcm_payers(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TYPE public.rcm_service_kind AS ENUM ('consultation','procedure','lab','radiology','medication','room_board','other');
CREATE TYPE public.rcm_time_band AS ENUM ('any','am','pm');

CREATE TABLE public.rcm_price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES public.rcm_price_lists(id) ON DELETE CASCADE,
  service_code text NOT NULL,
  service_name text NOT NULL,
  service_name_ar text,
  service_kind public.rcm_service_kind NOT NULL DEFAULT 'other',
  specialty text,
  sub_category text,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  time_band public.rcm_time_band NOT NULL DEFAULT 'any',
  is_referral_price boolean NOT NULL DEFAULT false,
  uom text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (price_list_id, service_code, time_band, is_referral_price)
);

CREATE TABLE public.rcm_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_ar text,
  duration_days integer NOT NULL DEFAULT 1,
  payer_id uuid REFERENCES public.rcm_payers(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES public.rcm_policies(id) ON DELETE SET NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.rcm_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.rcm_packages(id) ON DELETE CASCADE,
  service_code text NOT NULL,
  service_name text NOT NULL,
  qty numeric(10,2) NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============= Coverage / Approval / Discount Rules =============

CREATE TYPE public.rcm_rule_scope AS ENUM ('payer','policy','class','network');

CREATE TABLE public.rcm_coverage_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.rcm_rule_scope NOT NULL,
  payer_id uuid REFERENCES public.rcm_payers(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES public.rcm_policies(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.rcm_classes(id) ON DELETE CASCADE,
  network_id uuid REFERENCES public.rcm_networks(id) ON DELETE CASCADE,
  service_kind public.rcm_service_kind,
  specialty text,
  sub_category text,
  service_code text,
  is_covered boolean NOT NULL DEFAULT true,
  coverage_pct numeric(5,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rcm_not_covered_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.rcm_rule_scope NOT NULL,
  payer_id uuid REFERENCES public.rcm_payers(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES public.rcm_policies(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.rcm_classes(id) ON DELETE CASCADE,
  service_code text,
  service_kind public.rcm_service_kind,
  specialty text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rcm_need_approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.rcm_rule_scope NOT NULL,
  payer_id uuid REFERENCES public.rcm_payers(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES public.rcm_policies(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.rcm_classes(id) ON DELETE CASCADE,
  service_code text,
  service_kind public.rcm_service_kind,
  specialty text,
  special_condition text,
  ppd_threshold integer,
  exceed_approval_limit boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE public.rcm_discount_kind AS ENUM ('prompt_payment','volume','contractual_other');

CREATE TABLE public.rcm_discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id uuid NOT NULL REFERENCES public.rcm_payers(id) ON DELETE CASCADE,
  kind public.rcm_discount_kind NOT NULL,
  pct numeric(5,2),
  amount numeric(14,2),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  conditions text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- ============= Memberships, Eligibility, Activation Worklist =============

CREATE TABLE public.rcm_payer_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id uuid NOT NULL REFERENCES public.rcm_payers(id) ON DELETE RESTRICT,
  policy_id uuid REFERENCES public.rcm_policies(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.rcm_classes(id) ON DELETE SET NULL,
  network_id uuid REFERENCES public.rcm_networks(id) ON DELETE SET NULL,
  patient_device_id text,
  patient_profile_id uuid,
  member_number text NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  source text DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_rcm_memberships_device ON public.rcm_payer_memberships(patient_device_id);
CREATE INDEX idx_rcm_memberships_profile ON public.rcm_payer_memberships(patient_profile_id);

CREATE TYPE public.rcm_eligibility_status AS ENUM ('eligible','not_eligible','error','pending');
CREATE TYPE public.rcm_eligibility_exception AS ENUM ('none','referral','emergency_ctas','newborn');

CREATE TABLE public.rcm_eligibility_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  patient_device_id text,
  patient_profile_id uuid,
  visit_ref text,
  payer_id uuid REFERENCES public.rcm_payers(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES public.rcm_policies(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.rcm_classes(id) ON DELETE SET NULL,
  network_id uuid REFERENCES public.rcm_networks(id) ON DELETE SET NULL,
  membership_id uuid REFERENCES public.rcm_payer_memberships(id) ON DELETE SET NULL,
  status public.rcm_eligibility_status NOT NULL DEFAULT 'pending',
  exception_type public.rcm_eligibility_exception NOT NULL DEFAULT 'none',
  exception_evidence_url text,
  nphies_reference text,
  request_payload jsonb,
  response_payload jsonb,
  reason text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_rcm_eligibility_org ON public.rcm_eligibility_checks(organization_id);
CREATE INDEX idx_rcm_eligibility_device ON public.rcm_eligibility_checks(patient_device_id);

CREATE TYPE public.rcm_activation_status AS ENUM ('pending','assigned','in_progress','activated','rejected','cancelled');

CREATE TABLE public.rcm_policy_activation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_device_id text,
  patient_profile_id uuid,
  visit_ref text,
  eligibility_check_id uuid REFERENCES public.rcm_eligibility_checks(id) ON DELETE SET NULL,
  exception_type public.rcm_eligibility_exception NOT NULL DEFAULT 'none',
  evidence_url text,
  proposed_payer_id uuid REFERENCES public.rcm_payers(id) ON DELETE SET NULL,
  proposed_policy_id uuid REFERENCES public.rcm_policies(id) ON DELETE SET NULL,
  proposed_class_id uuid REFERENCES public.rcm_classes(id) ON DELETE SET NULL,
  proposed_network_id uuid REFERENCES public.rcm_networks(id) ON DELETE SET NULL,
  member_number text,
  validity_from date,
  validity_to date,
  status public.rcm_activation_status NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  assigned_at timestamptz,
  decision_notes text,
  decided_at timestamptz,
  decided_by uuid,
  resulting_membership_id uuid REFERENCES public.rcm_payer_memberships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX idx_rcm_activation_org ON public.rcm_policy_activation_requests(organization_id);
CREATE INDEX idx_rcm_activation_status ON public.rcm_policy_activation_requests(status);

-- ============= updated_at triggers =============
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'rcm_tpas','rcm_payers','rcm_policies','rcm_classes','rcm_networks',
    'rcm_price_lists','rcm_price_list_items','rcm_packages',
    'rcm_coverage_rules','rcm_discount_rules',
    'rcm_payer_memberships','rcm_policy_activation_requests'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      t, t
    );
  END LOOP;
END$$;

-- ============= Audit trigger for master data changes =============
CREATE OR REPLACE FUNCTION public.audit_rcm_master_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.log_audit_event(
    'rcm_master_' || TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object('op', TG_OP)
  );
  RETURN COALESCE(NEW, OLD);
END$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['rcm_tpas','rcm_payers','rcm_policies','rcm_classes','rcm_networks','rcm_price_lists','rcm_packages','rcm_discount_rules'])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_rcm_master_change();',
      t, t
    );
  END LOOP;
END$$;

-- ============= Enable RLS =============
ALTER TABLE public.rcm_tpas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_class_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_coverage_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_not_covered_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_need_approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_payer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_eligibility_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_policy_activation_requests ENABLE ROW LEVEL SECURITY;

-- ============= RLS policies =============

-- Master data: Admins manage; staff (admin+moderator) and any provider org member read.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'rcm_tpas','rcm_payers','rcm_policies','rcm_classes','rcm_networks','rcm_class_networks',
    'rcm_price_lists','rcm_price_list_items','rcm_packages','rcm_package_items',
    'rcm_coverage_rules','rcm_not_covered_rules','rcm_need_approval_rules','rcm_discount_rules'
  ])
  LOOP
    EXECUTE format($f$
      CREATE POLICY "Admins manage %1$s"
        ON public.%1$I FOR ALL TO authenticated
        USING (public.has_role(auth.uid(),'admin'))
        WITH CHECK (public.has_role(auth.uid(),'admin'));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Staff and org members read %1$s"
        ON public.%1$I FOR SELECT TO authenticated
        USING (
          public.has_role(auth.uid(),'admin')
          OR public.has_role(auth.uid(),'moderator')
          OR EXISTS (
            SELECT 1 FROM public.provider_members pm
            WHERE pm.user_id = auth.uid() AND pm.is_active = true
          )
        );
    $f$, t);
    -- Also allow public (anon device-based) read of price lists & packages for transparency? No — keep internal.
  END LOOP;
END$$;

-- Memberships: admin all; org members of any org may insert/read for their org-managed patients;
-- patient (anon via device header) may read their own.
CREATE POLICY "Admins manage memberships" ON public.rcm_payer_memberships
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Org members read memberships" ON public.rcm_payer_memberships
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.provider_members pm WHERE pm.user_id = auth.uid() AND pm.is_active = true)
  );

CREATE POLICY "Org members insert memberships" ON public.rcm_payer_memberships
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.provider_members pm WHERE pm.user_id = auth.uid() AND pm.is_active = true)
  );

CREATE POLICY "Patient reads own membership" ON public.rcm_payer_memberships
  FOR SELECT TO public USING (
    patient_device_id IS NOT NULL
    AND patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );

-- Eligibility checks
CREATE POLICY "Admins manage eligibility" ON public.rcm_eligibility_checks
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Org members manage eligibility" ON public.rcm_eligibility_checks
  FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Patient reads own eligibility" ON public.rcm_eligibility_checks
  FOR SELECT TO public USING (
    patient_device_id IS NOT NULL
    AND patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );

-- Activation worklist
CREATE POLICY "Admins manage activation" ON public.rcm_policy_activation_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Org members manage activation" ON public.rcm_policy_activation_requests
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Patient reads own activation" ON public.rcm_policy_activation_requests
  FOR SELECT TO public USING (
    patient_device_id IS NOT NULL
    AND patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );
