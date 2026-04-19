-- 1. Manual OTP codes (admin generates, user enters)
CREATE TABLE public.manual_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  code TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_manual_otp_recipient ON public.manual_otp_codes(recipient, used_at);
ALTER TABLE public.manual_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage manual otps"
ON public.manual_otp_codes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Editable site pages (Privacy, Terms, etc.)
CREATE TABLE public.site_pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads site pages"
ON public.site_pages FOR SELECT TO public USING (true);

CREATE POLICY "Admins manage site pages"
ON public.site_pages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_site_pages_updated_at
  BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_pages (slug, title, body_md) VALUES
  ('privacy', 'Privacy Policy', '# Privacy Policy\n\nUpdate this content from the admin dashboard.'),
  ('terms',   'Terms of Service', '# Terms of Service\n\nUpdate this content from the admin dashboard.')
ON CONFLICT (slug) DO NOTHING;

-- 3. Soft delete on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

-- 4. Trial extension audit fields
ALTER TABLE public.user_trials
  ADD COLUMN IF NOT EXISTS extended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS extension_reason TEXT,
  ADD COLUMN IF NOT EXISTS extended_at TIMESTAMPTZ;

-- 5. RPC: Generate a manual OTP code (admin only). Returns the code.
CREATE OR REPLACE FUNCTION public.admin_generate_manual_otp(_recipient TEXT)
RETURNS TABLE (code TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code TEXT;
  _expires TIMESTAMPTZ;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can generate manual OTP codes';
  END IF;
  _code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  _expires := now() + interval '15 minutes';
  INSERT INTO public.manual_otp_codes (recipient, code, created_by, expires_at)
  VALUES (_recipient, _code, auth.uid(), _expires);
  RETURN QUERY SELECT _code, _expires;
END;
$$;

-- 6. RPC: Verify a manual OTP code (called by verify-otp edge function)
CREATE OR REPLACE FUNCTION public.consume_manual_otp(_recipient TEXT, _code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row_id UUID;
BEGIN
  SELECT id INTO _row_id
  FROM public.manual_otp_codes
  WHERE recipient = _recipient
    AND code = _code
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  IF _row_id IS NULL THEN RETURN FALSE; END IF;
  UPDATE public.manual_otp_codes SET used_at = now() WHERE id = _row_id;
  RETURN TRUE;
END;
$$;