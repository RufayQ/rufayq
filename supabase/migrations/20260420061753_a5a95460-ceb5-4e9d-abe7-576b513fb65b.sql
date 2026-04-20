
-- Enums
CREATE TYPE public.rcm_encounter_type AS ENUM ('op','er','ip','dc');
CREATE TYPE public.rcm_auth_priority AS ENUM ('routine','urgent','emergency','stat');
CREATE TYPE public.rcm_auth_status AS ENUM (
  'draft','submitted','in_review','additional_info_requested',
  'approved','partial','conditional','rejected','cancelled','expired'
);
CREATE TYPE public.rcm_auth_item_status AS ENUM (
  'pending','approved','partial','conditional','rejected'
);
CREATE TYPE public.rcm_auth_event_type AS ENUM (
  'created','submitted','payer_response','additional_info_requested',
  'follow_up_sent','reminder','partial_decision','final_decision','cancelled','expired','note'
);

-- Main authorization request
CREATE TABLE public.rcm_authorization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_device_id TEXT,
  patient_profile_id UUID,
  visit_ref TEXT,
  encounter_type public.rcm_encounter_type NOT NULL DEFAULT 'op',
  priority public.rcm_auth_priority NOT NULL DEFAULT 'routine',
  payer_id UUID REFERENCES public.rcm_payers(id) ON DELETE SET NULL,
  policy_id UUID REFERENCES public.rcm_policies(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.rcm_classes(id) ON DELETE SET NULL,
  network_id UUID REFERENCES public.rcm_networks(id) ON DELETE SET NULL,
  membership_id UUID REFERENCES public.rcm_payer_memberships(id) ON DELETE SET NULL,
  eligibility_check_id UUID REFERENCES public.rcm_eligibility_checks(id) ON DELETE SET NULL,
  parent_request_id UUID REFERENCES public.rcm_authorization_requests(id) ON DELETE SET NULL,
  status public.rcm_auth_status NOT NULL DEFAULT 'draft',
  diagnosis_codes TEXT[],
  clinical_notes TEXT,
  scrubber_result JSONB,
  nphies_request_ref TEXT,
  nphies_response_ref TEXT,
  request_payload JSONB,
  response_payload JSONB,
  decision_notes TEXT,
  conditional_terms TEXT,
  partial_reason TEXT,
  rejection_reason TEXT,
  validity_from DATE,
  validity_to DATE,
  tat_due_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_req_org ON public.rcm_authorization_requests(organization_id);
CREATE INDEX idx_auth_req_status ON public.rcm_authorization_requests(status);
CREATE INDEX idx_auth_req_device ON public.rcm_authorization_requests(patient_device_id);
CREATE INDEX idx_auth_req_parent ON public.rcm_authorization_requests(parent_request_id);

CREATE TRIGGER trg_auth_req_updated
  BEFORE UPDATE ON public.rcm_authorization_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Items
CREATE TABLE public.rcm_authorization_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.rcm_authorization_requests(id) ON DELETE CASCADE,
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_kind public.rcm_service_kind,
  specialty TEXT,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC,
  requested_days INTEGER,
  status public.rcm_auth_item_status NOT NULL DEFAULT 'pending',
  approved_qty NUMERIC,
  approved_amount NUMERIC,
  denial_reason TEXT,
  condition_text TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_items_req ON public.rcm_authorization_items(request_id);
CREATE TRIGGER trg_auth_items_updated
  BEFORE UPDATE ON public.rcm_authorization_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Events (timeline)
CREATE TABLE public.rcm_authorization_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.rcm_authorization_requests(id) ON DELETE CASCADE,
  event_type public.rcm_auth_event_type NOT NULL,
  actor_id UUID,
  actor_role TEXT,
  notes TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_events_req ON public.rcm_authorization_events(request_id);

-- Attachments
CREATE TABLE public.rcm_authorization_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.rcm_authorization_requests(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_att_req ON public.rcm_authorization_attachments(request_id);

-- RLS
ALTER TABLE public.rcm_authorization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_authorization_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_authorization_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rcm_authorization_attachments ENABLE ROW LEVEL SECURITY;

-- Requests policies
CREATE POLICY "Admins manage auth requests" ON public.rcm_authorization_requests
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Org members manage own auth requests" ON public.rcm_authorization_requests
  FOR ALL TO authenticated
  USING (is_org_member(auth.uid(), organization_id))
  WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Patient reads own auth requests" ON public.rcm_authorization_requests
  FOR SELECT TO public
  USING (patient_device_id IS NOT NULL
         AND patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- Items policies (via parent request)
CREATE POLICY "Admins manage auth items" ON public.rcm_authorization_items
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Org members manage auth items" ON public.rcm_authorization_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_authorization_requests r
                 WHERE r.id = request_id AND is_org_member(auth.uid(), r.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_authorization_requests r
                 WHERE r.id = request_id AND is_org_member(auth.uid(), r.organization_id)));

CREATE POLICY "Patient reads own auth items" ON public.rcm_authorization_items
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.rcm_authorization_requests r
                 WHERE r.id = request_id
                   AND r.patient_device_id IS NOT NULL
                   AND r.patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')));

-- Events policies
CREATE POLICY "Admins manage auth events" ON public.rcm_authorization_events
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Org members manage auth events" ON public.rcm_authorization_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_authorization_requests r
                 WHERE r.id = request_id AND is_org_member(auth.uid(), r.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_authorization_requests r
                 WHERE r.id = request_id AND is_org_member(auth.uid(), r.organization_id)));

CREATE POLICY "Patient reads own auth events" ON public.rcm_authorization_events
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.rcm_authorization_requests r
                 WHERE r.id = request_id
                   AND r.patient_device_id IS NOT NULL
                   AND r.patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')));

-- Attachments policies
CREATE POLICY "Admins manage auth attachments" ON public.rcm_authorization_attachments
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Org members manage auth attachments" ON public.rcm_authorization_attachments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rcm_authorization_requests r
                 WHERE r.id = request_id AND is_org_member(auth.uid(), r.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rcm_authorization_requests r
                 WHERE r.id = request_id AND is_org_member(auth.uid(), r.organization_id)));

-- Notify patient when authorization changes status
CREATE OR REPLACE FUNCTION public.notify_patient_of_authorization()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _org_name TEXT; _title TEXT; _title_ar TEXT; _body TEXT;
BEGIN
  IF NEW.patient_device_id IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT name INTO _org_name FROM public.organizations WHERE id = NEW.organization_id;
    _title := CASE NEW.status
      WHEN 'submitted' THEN 'Authorization submitted'
      WHEN 'approved' THEN 'Authorization approved'
      WHEN 'partial' THEN 'Authorization partially approved'
      WHEN 'conditional' THEN 'Authorization approved with conditions'
      WHEN 'rejected' THEN 'Authorization rejected'
      WHEN 'additional_info_requested' THEN 'More info requested by payer'
      WHEN 'expired' THEN 'Authorization expired'
      WHEN 'cancelled' THEN 'Authorization cancelled'
      ELSE 'Authorization update' END;
    _title_ar := CASE NEW.status
      WHEN 'submitted' THEN 'تم تقديم طلب الموافقة'
      WHEN 'approved' THEN 'تمت الموافقة على الطلب'
      WHEN 'partial' THEN 'موافقة جزئية على الطلب'
      WHEN 'conditional' THEN 'موافقة مشروطة'
      WHEN 'rejected' THEN 'تم رفض الطلب'
      WHEN 'additional_info_requested' THEN 'طُلبت معلومات إضافية'
      WHEN 'expired' THEN 'انتهت صلاحية الطلب'
      WHEN 'cancelled' THEN 'تم إلغاء الطلب'
      ELSE 'تحديث طلب الموافقة' END;
    _body := COALESCE(_org_name,'Provider') || ' · visit ' || COALESCE(NEW.visit_ref,'-');

    INSERT INTO public.patient_notifications(
      patient_device_id, organization_id, kind, title, title_ar, body, body_ar, link
    ) VALUES (
      NEW.patient_device_id, NEW.organization_id, 'authorization',
      _title, _title_ar, _body, _body, '/profile?tab=rcm'
    );
  END IF;
  RETURN NEW;
END $fn$;

CREATE TRIGGER trg_auth_notify
  AFTER INSERT OR UPDATE OF status ON public.rcm_authorization_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_patient_of_authorization();

-- Audit status changes
CREATE OR REPLACE FUNCTION public.audit_authorization_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('auth_request_created','rcm_authorization_request',NEW.id::text,
      jsonb_build_object('org',NEW.organization_id,'status',NEW.status));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_audit_event('auth_request_status_changed','rcm_authorization_request',NEW.id::text,
      jsonb_build_object('from',OLD.status,'to',NEW.status));
  END IF;
  RETURN NEW;
END $fn$;

CREATE TRIGGER trg_auth_audit
  AFTER INSERT OR UPDATE ON public.rcm_authorization_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_authorization_change();

-- Helper: record follow-up event and bump TAT
CREATE OR REPLACE FUNCTION public.rcm_auth_follow_up(_request_id UUID, _hours INTEGER DEFAULT 24, _note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _org UUID;
BEGIN
  SELECT organization_id INTO _org FROM public.rcm_authorization_requests WHERE id = _request_id;
  IF _org IS NULL THEN RAISE EXCEPTION 'Authorization not found'; END IF;
  IF NOT (has_role(auth.uid(),'admin') OR is_org_member(auth.uid(),_org)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.rcm_authorization_events(request_id, event_type, actor_id, notes)
  VALUES (_request_id, 'follow_up_sent', auth.uid(), _note);
  UPDATE public.rcm_authorization_requests
    SET tat_due_at = COALESCE(tat_due_at, now()) + make_interval(hours => _hours),
        updated_at = now()
    WHERE id = _request_id;
END $fn$;
