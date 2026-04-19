-- ============ organizations ============
CREATE TYPE public.org_type AS ENUM ('hospital','vendor','insurance','patient_org','clinic','other');

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_type public.org_type NOT NULL DEFAULT 'other',
  contact_email TEXT,
  contact_phone TEXT,
  country TEXT,
  website TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage organizations"
ON public.organizations FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Staff view organizations"
ON public.organizations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TRIGGER organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Optional link from profiles -> organization (nullable; patients have none)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ============ admin_audit_log ============
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_audit_actor ON public.admin_audit_log(actor_id);
CREATE INDEX idx_audit_action ON public.admin_audit_log(action);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Moderators view non-sensitive audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'moderator') AND action NOT IN ('manual_otp_generated','user_role_added','user_role_removed','staff_user_created'));

-- No client INSERT policy: writes only happen through SECURITY DEFINER fn
CREATE POLICY "Block client inserts to audit"
ON public.admin_audit_log AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (false);

-- ============ log_audit_event helper ============
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _target_type TEXT DEFAULT NULL,
  _target_id TEXT DEFAULT NULL,
  _details JSONB DEFAULT NULL,
  _actor_id UUID DEFAULT NULL,
  _actor_email TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _id UUID;
  _aid UUID;
  _aemail TEXT;
  _arole TEXT;
BEGIN
  _aid := COALESCE(_actor_id, auth.uid());
  _aemail := _actor_email;
  IF _aid IS NOT NULL THEN
    IF public.has_role(_aid,'admin') THEN _arole := 'admin';
    ELSIF public.has_role(_aid,'moderator') THEN _arole := 'moderator';
    ELSE _arole := 'user'; END IF;
  END IF;
  INSERT INTO public.admin_audit_log(actor_id, actor_email, actor_role, action, target_type, target_id, details)
  VALUES (_aid, _aemail, _arole, _action, _target_type, _target_id, _details)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT,TEXT,TEXT,JSONB,UUID,TEXT) TO authenticated, anon, service_role;

-- ============ admin_create_user_role RPC ============
CREATE OR REPLACE FUNCTION public.admin_create_user_role(_user_id UUID, _role public.app_role)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role)
  ON CONFLICT DO NOTHING;
  PERFORM public.log_audit_event('user_role_added','user_role',_user_id::text, jsonb_build_object('role',_role));
END;
$$;

-- ============ patch consume_manual_otp to log ============
CREATE OR REPLACE FUNCTION public.consume_manual_otp(_recipient text, _code text)
 RETURNS boolean
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row_id UUID;
BEGIN
  SELECT id INTO _row_id FROM public.manual_otp_codes
  WHERE recipient = _recipient AND code = _code AND used_at IS NULL AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1;
  IF _row_id IS NULL THEN RETURN FALSE; END IF;
  UPDATE public.manual_otp_codes SET used_at = now() WHERE id = _row_id;
  PERFORM public.log_audit_event('manual_otp_consumed','recipient',_recipient,jsonb_build_object('otp_id',_row_id));
  RETURN TRUE;
END;
$$;

-- ============ patch admin_generate_manual_otp to log ============
CREATE OR REPLACE FUNCTION public.admin_generate_manual_otp(_recipient text)
 RETURNS TABLE(code text, expires_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _code TEXT; _expires TIMESTAMPTZ;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can generate manual OTP codes';
  END IF;
  _code := LPAD(FLOOR(RANDOM()*1000000)::TEXT, 6, '0');
  _expires := now() + interval '15 minutes';
  INSERT INTO public.manual_otp_codes(recipient, code, created_by, expires_at)
  VALUES (_recipient, _code, auth.uid(), _expires);
  PERFORM public.log_audit_event('manual_otp_generated','recipient',_recipient,jsonb_build_object('expires_at',_expires));
  RETURN QUERY SELECT _code, _expires;
END;
$$;

-- ============ seed orgs ============
INSERT INTO public.organizations(name, org_type, country, contact_email)
VALUES
('King Faisal Specialist Hospital','hospital','Saudi Arabia','intl@kfshrc.edu.sa'),
('Bupa Arabia','insurance','Saudi Arabia','support@bupa.com.sa');