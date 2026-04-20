
-- ============= ENUMS =============
CREATE TYPE public.rcm_visit_kind AS ENUM ('op_clinic','op_walkin','er_triage','er_resus','telemed','daycase_op');
CREATE TYPE public.rcm_visit_status AS ENUM ('open','in_progress','discharged','billed','closed','cancelled');
CREATE TYPE public.rcm_triage_level AS ENUM ('1_resuscitation','2_emergent','3_urgent','4_less_urgent','5_non_urgent','none');
CREATE TYPE public.rcm_diagnosis_role AS ENUM ('principal','secondary','admitting','discharge');
CREATE TYPE public.rcm_service_line_kind AS ENUM ('consultation','lab','radiology','procedure','medication','supply','room','observation','other');
CREATE TYPE public.rcm_service_line_decision AS ENUM ('pending','covered','partially_covered','not_covered','needs_approval','denied');
CREATE TYPE public.rcm_invoice_status AS ENUM ('draft','issued','partially_paid','paid','void','refunded');
CREATE TYPE public.rcm_payment_method AS ENUM ('cash','card','bank_transfer','wallet','insurance_writeoff','adjustment');

-- ============= rcm_visits =============
CREATE TABLE public.rcm_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_device_id TEXT,
  patient_profile_id UUID,
  visit_no TEXT,
  visit_kind public.rcm_visit_kind NOT NULL DEFAULT 'op_clinic',
  status public.rcm_visit_status NOT NULL DEFAULT 'open',
  triage_level public.rcm_triage_level NOT NULL DEFAULT 'none',
  chief_complaint TEXT,
  attending_name TEXT,
  attending_user_id UUID,
  specialty TEXT,
  arrival_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at TIMESTAMPTZ,
  discharge_at TIMESTAMPTZ,
  discharge_disposition TEXT,
  payer_id UUID REFERENCES public.rcm_payers(id),
  policy_id UUID REFERENCES public.rcm_policies(id),
  class_id UUID REFERENCES public.rcm_classes(id),
  network_id UUID REFERENCES public.rcm_networks(id),
  membership_id UUID REFERENCES public.rcm_payer_memberships(id),
  eligibility_check_id UUID REFERENCES public.rcm_eligibility_checks(id),
  is_self_pay BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rcm_visits_org ON public.rcm_visits(organization_id);
CREATE INDEX idx_rcm_visits_device ON public.rcm_visits(patient_device_id);
CREATE INDEX idx_rcm_visits_status ON public.rcm_visits(status);
CREATE INDEX idx_rcm_visits_arrival ON public.rcm_visits(arrival_at DESC);

-- ============= rcm_visit_diagnoses =============
CREATE TABLE public.rcm_visit_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.rcm_visits(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  code_system TEXT NOT NULL DEFAULT 'ICD-10',
  description TEXT,
  role public.rcm_diagnosis_role NOT NULL DEFAULT 'secondary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rcm_visit_diag_visit ON public.rcm_visit_diagnoses(visit_id);

-- ============= rcm_visit_services =============
CREATE TABLE public.rcm_visit_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.rcm_visits(id) ON DELETE CASCADE,
  line_kind public.rcm_service_line_kind NOT NULL DEFAULT 'consultation',
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  vat_pct NUMERIC NOT NULL DEFAULT 15,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  coverage_pct NUMERIC NOT NULL DEFAULT 0,
  payer_share NUMERIC NOT NULL DEFAULT 0,
  patient_share NUMERIC NOT NULL DEFAULT 0,
  deductible_amount NUMERIC NOT NULL DEFAULT 0,
  copay_amount NUMERIC NOT NULL DEFAULT 0,
  decision public.rcm_service_line_decision NOT NULL DEFAULT 'pending',
  denial_reason TEXT,
  authorization_request_id UUID REFERENCES public.rcm_authorization_requests(id),
  authorization_item_id UUID REFERENCES public.rcm_authorization_items(id),
  performed_at TIMESTAMPTZ DEFAULT now(),
  performed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rcm_visit_svc_visit ON public.rcm_visit_services(visit_id);
CREATE INDEX idx_rcm_visit_svc_decision ON public.rcm_visit_services(decision);

-- ============= rcm_visit_invoices =============
CREATE TABLE public.rcm_visit_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.rcm_visits(id) ON DELETE CASCADE,
  invoice_no TEXT,
  status public.rcm_invoice_status NOT NULL DEFAULT 'draft',
  gross_total NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC NOT NULL DEFAULT 0,
  vat_total NUMERIC NOT NULL DEFAULT 0,
  net_total NUMERIC NOT NULL DEFAULT 0,
  payer_share_total NUMERIC NOT NULL DEFAULT 0,
  patient_share_total NUMERIC NOT NULL DEFAULT 0,
  paid_total NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rcm_visit_inv_visit ON public.rcm_visit_invoices(visit_id);
CREATE INDEX idx_rcm_visit_inv_status ON public.rcm_visit_invoices(status);

-- ============= rcm_visit_payments =============
CREATE TABLE public.rcm_visit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.rcm_visit_invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  method public.rcm_payment_method NOT NULL DEFAULT 'cash',
  reference TEXT,
  collected_by UUID,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rcm_visit_pay_invoice ON public.rcm_visit_payments(invoice_id);

-- ============= RLS =============
ALTER TABLE public.rcm_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_visit_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_visit_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_visit_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_visit_payments ENABLE ROW LEVEL SECURITY;

-- visits
CREATE POLICY "Admins manage visits" ON public.rcm_visits FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Org members manage visits" ON public.rcm_visits FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), organization_id)) WITH CHECK (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Patient reads own visits" ON public.rcm_visits FOR SELECT TO public
  USING (patient_device_id IS NOT NULL AND patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- diagnoses
CREATE POLICY "Admins manage visit diagnoses" ON public.rcm_visit_diagnoses FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Org members manage visit diagnoses" ON public.rcm_visit_diagnoses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM rcm_visits v WHERE v.id = rcm_visit_diagnoses.visit_id AND is_org_member(auth.uid(), v.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM rcm_visits v WHERE v.id = rcm_visit_diagnoses.visit_id AND is_org_member(auth.uid(), v.organization_id)));
CREATE POLICY "Patient reads own visit diagnoses" ON public.rcm_visit_diagnoses FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM rcm_visits v WHERE v.id = rcm_visit_diagnoses.visit_id AND v.patient_device_id IS NOT NULL AND v.patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')));

-- services
CREATE POLICY "Admins manage visit services" ON public.rcm_visit_services FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Org members manage visit services" ON public.rcm_visit_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM rcm_visits v WHERE v.id = rcm_visit_services.visit_id AND is_org_member(auth.uid(), v.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM rcm_visits v WHERE v.id = rcm_visit_services.visit_id AND is_org_member(auth.uid(), v.organization_id)));
CREATE POLICY "Patient reads own visit services" ON public.rcm_visit_services FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM rcm_visits v WHERE v.id = rcm_visit_services.visit_id AND v.patient_device_id IS NOT NULL AND v.patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')));

-- invoices
CREATE POLICY "Admins manage visit invoices" ON public.rcm_visit_invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Org members manage visit invoices" ON public.rcm_visit_invoices FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM rcm_visits v WHERE v.id = rcm_visit_invoices.visit_id AND is_org_member(auth.uid(), v.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM rcm_visits v WHERE v.id = rcm_visit_invoices.visit_id AND is_org_member(auth.uid(), v.organization_id)));
CREATE POLICY "Patient reads own visit invoices" ON public.rcm_visit_invoices FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM rcm_visits v WHERE v.id = rcm_visit_invoices.visit_id AND v.patient_device_id IS NOT NULL AND v.patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')));

-- payments
CREATE POLICY "Admins manage visit payments" ON public.rcm_visit_payments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Org members manage visit payments" ON public.rcm_visit_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM rcm_visit_invoices i JOIN rcm_visits v ON v.id = i.visit_id WHERE i.id = rcm_visit_payments.invoice_id AND is_org_member(auth.uid(), v.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM rcm_visit_invoices i JOIN rcm_visits v ON v.id = i.visit_id WHERE i.id = rcm_visit_payments.invoice_id AND is_org_member(auth.uid(), v.organization_id)));
CREATE POLICY "Patient reads own visit payments" ON public.rcm_visit_payments FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM rcm_visit_invoices i JOIN rcm_visits v ON v.id = i.visit_id WHERE i.id = rcm_visit_payments.invoice_id AND v.patient_device_id IS NOT NULL AND v.patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')));

-- ============= TRIGGERS =============
-- updated_at
CREATE TRIGGER trg_rcm_visits_uat BEFORE UPDATE ON public.rcm_visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rcm_visit_svc_uat BEFORE UPDATE ON public.rcm_visit_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rcm_visit_inv_uat BEFORE UPDATE ON public.rcm_visit_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-compute service line totals
CREATE OR REPLACE FUNCTION public.rcm_compute_service_line()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.gross_amount := COALESCE(NEW.qty,0) * COALESCE(NEW.unit_price,0);
  NEW.vat_amount := ROUND(((NEW.gross_amount - COALESCE(NEW.discount_amount,0)) * COALESCE(NEW.vat_pct,0) / 100)::numeric, 2);
  NEW.net_amount := (NEW.gross_amount - COALESCE(NEW.discount_amount,0)) + NEW.vat_amount;
  NEW.payer_share := ROUND((NEW.net_amount * COALESCE(NEW.coverage_pct,0) / 100)::numeric, 2);
  NEW.patient_share := NEW.net_amount - NEW.payer_share + COALESCE(NEW.deductible_amount,0) + COALESCE(NEW.copay_amount,0);
  IF NEW.patient_share < 0 THEN NEW.patient_share := 0; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rcm_visit_svc_compute BEFORE INSERT OR UPDATE ON public.rcm_visit_services
  FOR EACH ROW EXECUTE FUNCTION public.rcm_compute_service_line();

-- Recompute invoice totals on service/payment change
CREATE OR REPLACE FUNCTION public.rcm_recompute_invoice(_visit_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv UUID; _g NUMERIC; _d NUMERIC; _v NUMERIC; _n NUMERIC; _ps NUMERIC; _pts NUMERIC; _paid NUMERIC;
BEGIN
  SELECT id INTO _inv FROM public.rcm_visit_invoices WHERE visit_id = _visit_id ORDER BY created_at DESC LIMIT 1;
  IF _inv IS NULL THEN RETURN; END IF;
  SELECT
    COALESCE(SUM(gross_amount),0), COALESCE(SUM(discount_amount),0),
    COALESCE(SUM(vat_amount),0), COALESCE(SUM(net_amount),0),
    COALESCE(SUM(payer_share),0), COALESCE(SUM(patient_share),0)
    INTO _g,_d,_v,_n,_ps,_pts
  FROM public.rcm_visit_services WHERE visit_id = _visit_id;
  SELECT COALESCE(SUM(amount),0) INTO _paid FROM public.rcm_visit_payments WHERE invoice_id = _inv;
  UPDATE public.rcm_visit_invoices
    SET gross_total=_g, discount_total=_d, vat_total=_v, net_total=_n,
        payer_share_total=_ps, patient_share_total=_pts,
        paid_total=_paid, balance_due=GREATEST(_pts - _paid, 0),
        status = CASE
          WHEN status = 'void' THEN 'void'
          WHEN _paid >= _pts AND _pts > 0 THEN 'paid'
          WHEN _paid > 0 THEN 'partially_paid'
          ELSE status END,
        updated_at = now()
    WHERE id = _inv;
END $$;

CREATE OR REPLACE FUNCTION public.trg_rcm_recompute_from_service()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.rcm_recompute_invoice(COALESCE(NEW.visit_id, OLD.visit_id));
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_rcm_visit_svc_recompute AFTER INSERT OR UPDATE OR DELETE ON public.rcm_visit_services
  FOR EACH ROW EXECUTE FUNCTION public.trg_rcm_recompute_from_service();

CREATE OR REPLACE FUNCTION public.trg_rcm_recompute_from_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vid UUID;
BEGIN
  SELECT visit_id INTO _vid FROM public.rcm_visit_invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF _vid IS NOT NULL THEN PERFORM public.rcm_recompute_invoice(_vid); END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_rcm_visit_pay_recompute AFTER INSERT OR UPDATE OR DELETE ON public.rcm_visit_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_rcm_recompute_from_payment();

-- Auto generate visit_no & invoice_no
CREATE OR REPLACE FUNCTION public.rcm_assign_visit_no()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.visit_no IS NULL OR NEW.visit_no = '' THEN
    NEW.visit_no := 'V-' || to_char(now(),'YYMMDD') || '-' || LPAD(FLOOR(RANDOM()*100000)::TEXT,5,'0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rcm_visit_no BEFORE INSERT ON public.rcm_visits
  FOR EACH ROW EXECUTE FUNCTION public.rcm_assign_visit_no();

CREATE OR REPLACE FUNCTION public.rcm_assign_invoice_no()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := 'INV-' || to_char(now(),'YYMMDD') || '-' || LPAD(FLOOR(RANDOM()*100000)::TEXT,5,'0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rcm_invoice_no BEFORE INSERT ON public.rcm_visit_invoices
  FOR EACH ROW EXECUTE FUNCTION public.rcm_assign_invoice_no();

-- Notify patient when invoice issued
CREATE OR REPLACE FUNCTION public.rcm_notify_patient_invoice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dev TEXT; _org UUID; _org_name TEXT;
BEGIN
  IF NEW.status = 'issued' AND (OLD.status IS DISTINCT FROM 'issued') THEN
    SELECT v.patient_device_id, v.organization_id INTO _dev, _org FROM public.rcm_visits v WHERE v.id = NEW.visit_id;
    IF _dev IS NOT NULL THEN
      SELECT name INTO _org_name FROM public.organizations WHERE id = _org;
      INSERT INTO public.patient_notifications(patient_device_id, organization_id, kind, title, title_ar, body, body_ar, link)
      VALUES (_dev, _org, 'invoice',
        'Invoice issued: ' || COALESCE(NEW.invoice_no,''),
        'تم إصدار فاتورة: ' || COALESCE(NEW.invoice_no,''),
        COALESCE(_org_name,'Provider') || ' · Patient share ' || NEW.patient_share_total || ' ' || NEW.currency,
        COALESCE(_org_name,'مزوّد') || ' · حصة المريض ' || NEW.patient_share_total || ' ' || NEW.currency,
        '/profile?tab=rcm');
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rcm_invoice_notify AFTER UPDATE ON public.rcm_visit_invoices
  FOR EACH ROW EXECUTE FUNCTION public.rcm_notify_patient_invoice();

-- Audit hook on visit status changes
CREATE OR REPLACE FUNCTION public.audit_visit_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('rcm_visit_created','rcm_visit',NEW.id::text,
      jsonb_build_object('org',NEW.organization_id,'kind',NEW.visit_kind));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_audit_event('rcm_visit_status_changed','rcm_visit',NEW.id::text,
      jsonb_build_object('from',OLD.status,'to',NEW.status));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rcm_visit_audit AFTER INSERT OR UPDATE ON public.rcm_visits
  FOR EACH ROW EXECUTE FUNCTION public.audit_visit_change();
