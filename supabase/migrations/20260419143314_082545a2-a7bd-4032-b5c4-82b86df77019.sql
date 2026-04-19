
-- ============ PROVIDER MEMBERS (auth users <-> organizations) ============
CREATE TABLE IF NOT EXISTS public.provider_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'staff', -- 'owner' | 'staff' | 'physician'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);
ALTER TABLE public.provider_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.provider_members
    WHERE user_id=_user_id AND organization_id=_org_id AND is_active=true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_org_ids(_user_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT organization_id FROM public.provider_members
  WHERE user_id=_user_id AND is_active=true;
$$;

CREATE POLICY "Members view own membership" ON public.provider_members
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage memberships" ON public.provider_members
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PROVIDER <-> PATIENT LINK ============
CREATE TABLE IF NOT EXISTS public.provider_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_device_id TEXT NOT NULL,
  patient_name TEXT,
  patient_email TEXT,
  patient_phone TEXT,
  assigned_provider_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, patient_device_id)
);
ALTER TABLE public.provider_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view patients"
  ON public.provider_patients FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Org members manage patients"
  ON public.provider_patients FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Patient sees own link"
  ON public.provider_patients FOR SELECT TO public
  USING (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ============ PATIENT NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.patient_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_device_id TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  title_ar TEXT,
  body TEXT,
  body_ar TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient reads own notifications" ON public.patient_notifications
  FOR SELECT TO public
  USING (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "Patient updates own notifications" ON public.patient_notifications
  FOR UPDATE TO public
  USING (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  WITH CHECK (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "Org members view sent notifications" ON public.patient_notifications
  FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members create notifications" ON public.patient_notifications
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_notifications;
ALTER TABLE public.patient_notifications REPLICA IDENTITY FULL;

-- ============ PROVIDER INSTRUCTIONS ============
CREATE TABLE IF NOT EXISTS public.provider_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_device_id TEXT NOT NULL,
  author_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  body_ar TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage instructions" ON public.provider_instructions
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Patient reads own instructions" ON public.provider_instructions
  FOR SELECT TO public
  USING (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ============ PROVIDER MEDICATION UPDATES ============
CREATE TABLE IF NOT EXISTS public.provider_medication_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_device_id TEXT NOT NULL,
  author_id UUID,
  action TEXT NOT NULL DEFAULT 'add', -- add | update | stop
  med_name TEXT NOT NULL,
  dose TEXT,
  frequency TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_medication_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage med updates" ON public.provider_medication_updates
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Patient reads own med updates" ON public.provider_medication_updates
  FOR SELECT TO public
  USING (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ============ PROVIDER APPOINTMENTS ============
CREATE TABLE IF NOT EXISTS public.provider_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_device_id TEXT NOT NULL,
  author_id UUID,
  title TEXT NOT NULL,
  location TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage appointments" ON public.provider_appointments
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Patient reads own appointments" ON public.provider_appointments
  FOR SELECT TO public
  USING (patient_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ============ AUTO-NOTIFY TRIGGERS ============
CREATE OR REPLACE FUNCTION public.notify_patient_from_provider()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _title TEXT; _title_ar TEXT; _body TEXT; _body_ar TEXT; _kind TEXT; _link TEXT;
BEGIN
  IF TG_TABLE_NAME = 'provider_instructions' THEN
    _title := 'New health instruction'; _title_ar := 'تعليمات صحية جديدة';
    _body := NEW.title; _body_ar := NEW.body_ar; _kind := 'instruction'; _link := '/carehub';
  ELSIF TG_TABLE_NAME = 'provider_medication_updates' THEN
    _title := 'Medication ' || NEW.action || ': ' || NEW.med_name;
    _title_ar := 'تحديث دواء: ' || NEW.med_name;
    _body := COALESCE(NEW.dose,'') || ' ' || COALESCE(NEW.frequency,''); _kind := 'medication'; _link := '/medications';
  ELSIF TG_TABLE_NAME = 'provider_appointments' THEN
    _title := 'New appointment: ' || NEW.title; _title_ar := 'موعد جديد';
    _body := to_char(NEW.scheduled_at,'YYYY-MM-DD HH24:MI'); _kind := 'appointment'; _link := '/journey';
  END IF;
  INSERT INTO public.patient_notifications(patient_device_id, organization_id, kind, title, title_ar, body, body_ar, link)
  VALUES (NEW.patient_device_id, NEW.organization_id, _kind, _title, _title_ar, _body, _body_ar, _link);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_instructions ON public.provider_instructions;
CREATE TRIGGER trg_notify_instructions AFTER INSERT ON public.provider_instructions
  FOR EACH ROW EXECUTE FUNCTION public.notify_patient_from_provider();

DROP TRIGGER IF EXISTS trg_notify_meds ON public.provider_medication_updates;
CREATE TRIGGER trg_notify_meds AFTER INSERT ON public.provider_medication_updates
  FOR EACH ROW EXECUTE FUNCTION public.notify_patient_from_provider();

DROP TRIGGER IF EXISTS trg_notify_appts ON public.provider_appointments;
CREATE TRIGGER trg_notify_appts AFTER INSERT ON public.provider_appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_patient_from_provider();

-- updated_at triggers
CREATE TRIGGER trg_pp_updated BEFORE UPDATE ON public.provider_patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pi_updated BEFORE UPDATE ON public.provider_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
