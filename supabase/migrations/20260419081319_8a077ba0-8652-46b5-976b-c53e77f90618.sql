-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. OTP send log (rate limiting)
CREATE TABLE public.otp_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_send_log_recipient_sent ON public.otp_send_log (recipient, sent_at DESC);

ALTER TABLE public.otp_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view OTP send log"
  ON public.otp_send_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- (No insert/update/delete policies — only the service role from edge functions writes here.)

-- 3. User status (activation / hold / suspend)
CREATE TYPE public.user_status_enum AS ENUM ('active', 'on_hold', 'suspended');

CREATE TABLE public.user_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.user_status_enum NOT NULL DEFAULT 'active',
  reason TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own status"
  ON public.user_status FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all statuses"
  ON public.user_status FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage statuses"
  ON public.user_status FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_user_status_updated_at
  BEFORE UPDATE ON public.user_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create active user_status row when an Auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_status (user_id, status)
  VALUES (NEW.id, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_status
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_status();

-- 4. Tighten review moderation: only admins can approve/update
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.app_reviews;

CREATE POLICY "Public reads approved reviews"
  ON public.app_reviews FOR SELECT
  USING (approved = true);

CREATE POLICY "Admins read all reviews"
  ON public.app_reviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update reviews"
  ON public.app_reviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete reviews"
  ON public.app_reviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Tighten support tickets: only admins update; restrict reads
DROP POLICY IF EXISTS "Anyone can view tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.support_tickets;

CREATE POLICY "Admins view all tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));