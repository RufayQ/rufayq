
-- Drop legacy function so we can recreate with same signature but stricter logic
DROP FUNCTION IF EXISTS public.rcm_advance_discharge(uuid, rcm_discharge_stage, text);

-- =========================================================
-- PART A: Medical Discharge (triple sign-off)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.rcm_discharge_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID NOT NULL REFERENCES public.rcm_admissions(id) ON DELETE CASCADE,
  nursing_signed_at TIMESTAMPTZ,
  nursing_signed_by UUID,
  nursing_notes TEXT,
  pharmacy_signed_at TIMESTAMPTZ,
  pharmacy_signed_by UUID,
  pharmacy_notes TEXT,
  physician_signed_at TIMESTAMPTZ,
  physician_signed_by UUID,
  physician_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(admission_id)
);

ALTER TABLE public.rcm_discharge_signoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage signoffs" ON public.rcm_discharge_signoffs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members manage signoffs" ON public.rcm_discharge_signoffs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_admissions a WHERE a.id = admission_id AND is_org_member(auth.uid(), a.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_admissions a WHERE a.id = admission_id AND is_org_member(auth.uid(), a.organization_id)));

CREATE POLICY "Patient reads own signoffs" ON public.rcm_discharge_signoffs
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.rcm_admissions a
    WHERE a.id = admission_id
      AND a.patient_device_id IS NOT NULL
      AND a.patient_device_id = ((current_setting('request.headers', true))::json->>'x-device-id')));

CREATE OR REPLACE FUNCTION public.rcm_advance_discharge(_admission_id UUID, _stage rcm_discharge_stage, _notes TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.rcm_discharge_signoffs%ROWTYPE;
BEGIN
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
$$;

-- =========================================================
-- PART B: Claim Management
-- =========================================================
DO $$ BEGIN CREATE TYPE public.rcm_claim_status AS ENUM ('draft','scrubbing','ready','submitted','accepted','rejected','partially_paid','paid','denied','appealed','closed','void'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_submission_status AS ENUM ('queued','sent','accepted','rejected','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_remit_line_status AS ENUM ('paid','partial','denied','adjusted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_payment_method AS ENUM ('bank_transfer','cheque','cash','card','offset'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_bulk_kind AS ENUM ('claim_upload','claim_correction','remittance_upload','price_correction'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rcm_bulk_status AS ENUM ('uploaded','parsing','parsed','applying','applied','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.rcm_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_no TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  encounter_type rcm_encounter_type NOT NULL DEFAULT 'op',
  visit_id UUID, admission_id UUID,
  patient_device_id TEXT, patient_profile_id UUID,
  payer_id UUID, policy_id UUID, class_id UUID, network_id UUID, authorization_id UUID,
  diagnosis_codes TEXT[] DEFAULT '{}',
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payer_share NUMERIC(14,2) NOT NULL DEFAULT 0,
  patient_share NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  denied_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  outstanding_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status rcm_claim_status NOT NULL DEFAULT 'draft',
  nphies_request_ref TEXT, nphies_response_ref TEXT,
  scrubber_result JSONB, notes TEXT,
  submitted_at TIMESTAMPTZ, closed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claims_org ON public.rcm_claims(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_payer ON public.rcm_claims(payer_id);
CREATE INDEX IF NOT EXISTS idx_claims_device ON public.rcm_claims(patient_device_id);

CREATE TABLE IF NOT EXISTS public.rcm_claim_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.rcm_claims(id) ON DELETE CASCADE,
  line_no INT,
  service_code TEXT NOT NULL, service_name TEXT NOT NULL,
  service_kind rcm_service_kind, specialty TEXT,
  qty NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payer_share NUMERIC(14,2) NOT NULL DEFAULT 0,
  patient_share NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  denied_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  denial_reason TEXT, source_visit_service_id UUID, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_lines_claim ON public.rcm_claim_lines(claim_id);

CREATE TABLE IF NOT EXISTS public.rcm_claim_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.rcm_claims(id) ON DELETE CASCADE,
  attempt_no INT NOT NULL DEFAULT 1,
  status rcm_submission_status NOT NULL DEFAULT 'queued',
  nphies_batch_id TEXT, request_payload JSONB, response_payload JSONB,
  error_message TEXT, submitted_by UUID,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(), responded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.rcm_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payer_id UUID, remit_no TEXT,
  remit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_denied NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_adjusted NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference TEXT, source_filename TEXT, notes TEXT, created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rcm_remittance_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remittance_id UUID NOT NULL REFERENCES public.rcm_remittances(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.rcm_claims(id) ON DELETE SET NULL,
  claim_line_id UUID REFERENCES public.rcm_claim_lines(id) ON DELETE SET NULL,
  status rcm_remit_line_status NOT NULL DEFAULT 'paid',
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  denied_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  adjusted_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  reason_code TEXT, reason_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_remit_lines_claim ON public.rcm_remittance_lines(claim_id);

CREATE TABLE IF NOT EXISTS public.rcm_claim_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.rcm_claims(id) ON DELETE CASCADE,
  remittance_id UUID REFERENCES public.rcm_remittances(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  method rcm_payment_method NOT NULL DEFAULT 'bank_transfer',
  reference TEXT, paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rcm_claim_denials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.rcm_claims(id) ON DELETE CASCADE,
  claim_line_id UUID REFERENCES public.rcm_claim_lines(id) ON DELETE SET NULL,
  reason_code TEXT, reason_text TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  appeal_status TEXT NOT NULL DEFAULT 'open',
  appealed_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
  notes TEXT, created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rcm_bulk_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  kind rcm_bulk_kind NOT NULL,
  status rcm_bulk_status NOT NULL DEFAULT 'uploaded',
  source_filename TEXT, source_url TEXT, source_mime TEXT,
  parsed_payload JSONB,
  total_rows INT NOT NULL DEFAULT 0,
  applied_rows INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  error_message TEXT, ai_summary TEXT,
  created_by UUID, applied_by UUID, applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers
CREATE OR REPLACE FUNCTION public.rcm_assign_claim_no()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE seq INT;
BEGIN
  IF NEW.claim_no IS NULL OR NEW.claim_no = '' THEN
    SELECT COUNT(*) + 1 INTO seq FROM public.rcm_claims WHERE created_at::date = CURRENT_DATE;
    NEW.claim_no := 'CLM-' || to_char(now(), 'YYMMDD') || '-' || lpad(seq::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_claim_no ON public.rcm_claims;
CREATE TRIGGER trg_claim_no BEFORE INSERT ON public.rcm_claims
FOR EACH ROW EXECUTE FUNCTION public.rcm_assign_claim_no();

CREATE OR REPLACE FUNCTION public.rcm_compute_claim_line()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.gross_amount IS NULL OR NEW.gross_amount = 0 THEN
    NEW.gross_amount := COALESCE(NEW.qty,1) * COALESCE(NEW.unit_price,0);
  END IF;
  NEW.net_amount := COALESCE(NEW.gross_amount,0) - COALESCE(NEW.discount_amount,0) + COALESCE(NEW.vat_amount,0);
  IF (NEW.payer_share IS NULL OR NEW.payer_share = 0) AND (NEW.patient_share IS NULL OR NEW.patient_share = 0) THEN
    NEW.payer_share := NEW.net_amount; NEW.patient_share := 0;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_claim_line_compute ON public.rcm_claim_lines;
CREATE TRIGGER trg_claim_line_compute BEFORE INSERT OR UPDATE ON public.rcm_claim_lines
FOR EACH ROW EXECUTE FUNCTION public.rcm_compute_claim_line();

CREATE OR REPLACE FUNCTION public.rcm_recompute_claim_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid UUID;
BEGIN
  cid := COALESCE(NEW.claim_id, OLD.claim_id);
  UPDATE public.rcm_claims c SET
    gross_amount    = COALESCE((SELECT SUM(gross_amount)    FROM public.rcm_claim_lines WHERE claim_id = cid), 0),
    discount_amount = COALESCE((SELECT SUM(discount_amount) FROM public.rcm_claim_lines WHERE claim_id = cid), 0),
    vat_amount      = COALESCE((SELECT SUM(vat_amount)      FROM public.rcm_claim_lines WHERE claim_id = cid), 0),
    net_amount      = COALESCE((SELECT SUM(net_amount)      FROM public.rcm_claim_lines WHERE claim_id = cid), 0),
    payer_share     = COALESCE((SELECT SUM(payer_share)     FROM public.rcm_claim_lines WHERE claim_id = cid), 0),
    patient_share   = COALESCE((SELECT SUM(patient_share)   FROM public.rcm_claim_lines WHERE claim_id = cid), 0),
    updated_at = now()
  WHERE c.id = cid;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_claim_lines_recompute ON public.rcm_claim_lines;
CREATE TRIGGER trg_claim_lines_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.rcm_claim_lines
FOR EACH ROW EXECUTE FUNCTION public.rcm_recompute_claim_totals();

CREATE OR REPLACE FUNCTION public.rcm_recompute_claim_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid UUID; paid NUMERIC; denied NUMERIC; pay_total NUMERIC; new_status rcm_claim_status;
  cur_status rcm_claim_status; net NUMERIC;
BEGIN
  cid := COALESCE(NEW.claim_id, OLD.claim_id);
  IF cid IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(SUM(paid_amount),0), COALESCE(SUM(denied_amount),0) INTO paid, denied
    FROM public.rcm_remittance_lines WHERE claim_id = cid;
  SELECT COALESCE(SUM(amount),0) INTO pay_total
    FROM public.rcm_claim_payments WHERE claim_id = cid;
  SELECT status, net_amount INTO cur_status, net FROM public.rcm_claims WHERE id = cid;
  paid := GREATEST(paid, pay_total);
  new_status := cur_status;
  IF cur_status NOT IN ('void','closed','draft') THEN
    IF paid >= COALESCE(net,0) AND COALESCE(net,0) > 0 THEN new_status := 'paid';
    ELSIF paid > 0 AND paid < COALESCE(net,0) THEN new_status := 'partially_paid';
    ELSIF denied > 0 AND paid = 0 THEN new_status := 'denied';
    END IF;
  END IF;
  UPDATE public.rcm_claims SET
    paid_amount = paid, denied_amount = denied,
    outstanding_amount = GREATEST(COALESCE(net,0) - paid, 0),
    status = new_status, updated_at = now()
  WHERE id = cid;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_remit_line_balance ON public.rcm_remittance_lines;
CREATE TRIGGER trg_remit_line_balance AFTER INSERT OR UPDATE OR DELETE ON public.rcm_remittance_lines
FOR EACH ROW EXECUTE FUNCTION public.rcm_recompute_claim_balance();
DROP TRIGGER IF EXISTS trg_payment_balance ON public.rcm_claim_payments;
CREATE TRIGGER trg_payment_balance AFTER INSERT OR UPDATE OR DELETE ON public.rcm_claim_payments
FOR EACH ROW EXECUTE FUNCTION public.rcm_recompute_claim_balance();

CREATE OR REPLACE FUNCTION public.rcm_claim_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.patient_device_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status IN ('paid','partially_paid','denied','submitted') THEN
    INSERT INTO public.patient_notifications(patient_device_id, organization_id, kind, title, title_ar, body, body_ar)
    VALUES (
      NEW.patient_device_id, NEW.organization_id, 'claim',
      'Claim ' || COALESCE(NEW.claim_no,'') || ' · ' || NEW.status,
      'مطالبة ' || COALESCE(NEW.claim_no,'') || ' · ' || NEW.status,
      'Outstanding: SAR ' || NEW.outstanding_amount::text,
      'المتبقي: ' || NEW.outstanding_amount::text || ' ر.س'
    );
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_claim_notify ON public.rcm_claims;
CREATE TRIGGER trg_claim_notify AFTER INSERT OR UPDATE OF status ON public.rcm_claims
FOR EACH ROW EXECUTE FUNCTION public.rcm_claim_notify();

-- RLS
ALTER TABLE public.rcm_claims              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_claim_lines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_claim_submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_remittances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_remittance_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_claim_payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_claim_denials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_bulk_jobs           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage claims" ON public.rcm_claims FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Org members manage claims" ON public.rcm_claims FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), organization_id)) WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Patient reads own claims" ON public.rcm_claims FOR SELECT TO public
  USING (patient_device_id IS NOT NULL AND patient_device_id = ((current_setting('request.headers', true))::json->>'x-device-id'));

CREATE POLICY "Admins manage claim lines" ON public.rcm_claim_lines FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Org members manage claim lines" ON public.rcm_claim_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id AND is_org_member(auth.uid(), c.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id AND is_org_member(auth.uid(), c.organization_id)));
CREATE POLICY "Patient reads own claim lines" ON public.rcm_claim_lines FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id
    AND c.patient_device_id IS NOT NULL
    AND c.patient_device_id = ((current_setting('request.headers', true))::json->>'x-device-id')));

CREATE POLICY "Admins manage submissions" ON public.rcm_claim_submissions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Org members manage submissions" ON public.rcm_claim_submissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id AND is_org_member(auth.uid(), c.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id AND is_org_member(auth.uid(), c.organization_id)));

CREATE POLICY "Admins manage remittances" ON public.rcm_remittances FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Org members manage remittances" ON public.rcm_remittances FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), organization_id)) WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins manage remit lines" ON public.rcm_remittance_lines FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Org members manage remit lines" ON public.rcm_remittance_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_remittances r WHERE r.id = remittance_id AND is_org_member(auth.uid(), r.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_remittances r WHERE r.id = remittance_id AND is_org_member(auth.uid(), r.organization_id)));
CREATE POLICY "Patient reads own remit lines" ON public.rcm_remittance_lines FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id
    AND c.patient_device_id IS NOT NULL
    AND c.patient_device_id = ((current_setting('request.headers', true))::json->>'x-device-id')));

CREATE POLICY "Admins manage payments" ON public.rcm_claim_payments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Org members manage payments" ON public.rcm_claim_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id AND is_org_member(auth.uid(), c.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id AND is_org_member(auth.uid(), c.organization_id)));
CREATE POLICY "Patient reads own claim payments" ON public.rcm_claim_payments FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id
    AND c.patient_device_id IS NOT NULL
    AND c.patient_device_id = ((current_setting('request.headers', true))::json->>'x-device-id')));

CREATE POLICY "Admins manage denials" ON public.rcm_claim_denials FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Org members manage denials" ON public.rcm_claim_denials FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id AND is_org_member(auth.uid(), c.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id AND is_org_member(auth.uid(), c.organization_id)));
CREATE POLICY "Patient reads own denials" ON public.rcm_claim_denials FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.rcm_claims c WHERE c.id = claim_id
    AND c.patient_device_id IS NOT NULL
    AND c.patient_device_id = ((current_setting('request.headers', true))::json->>'x-device-id')));

CREATE POLICY "Admins manage bulk jobs" ON public.rcm_bulk_jobs FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Org members manage own bulk jobs" ON public.rcm_bulk_jobs FOR ALL TO authenticated
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
  WITH CHECK (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));
