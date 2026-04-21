
-- Enums
DO $$ BEGIN
  CREATE TYPE public.verification_assist_kind AS ENUM ('manual_code', 'profile_activation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_assist_status AS ENUM ('pending', 'in_progress', 'fulfilled', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.verification_assistance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.verification_assist_kind NOT NULL,
  status public.verification_assist_status NOT NULL DEFAULT 'pending',
  channel text,                       -- whatsapp / sms / email (for manual_code)
  recipient text NOT NULL,            -- email or E.164 phone the user is registering with
  full_name text,
  note text,
  device_id text,
  handled_by uuid,
  handled_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_var_status ON public.verification_assistance_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_var_recipient ON public.verification_assistance_requests (recipient);

-- updated_at trigger (reuse existing helper)
DROP TRIGGER IF EXISTS set_var_updated_at ON public.verification_assistance_requests;
CREATE TRIGGER set_var_updated_at
BEFORE UPDATE ON public.verification_assistance_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.verification_assistance_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated sign-up flow) can submit a fallback request.
DROP POLICY IF EXISTS "Public submits assistance request" ON public.verification_assistance_requests;
CREATE POLICY "Public submits assistance request"
ON public.verification_assistance_requests
FOR INSERT
TO public
WITH CHECK (status = 'pending');

-- Staff (admin/moderator) can read and update
DROP POLICY IF EXISTS "Staff view assistance requests" ON public.verification_assistance_requests;
CREATE POLICY "Staff view assistance requests"
ON public.verification_assistance_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Admins update assistance requests" ON public.verification_assistance_requests;
CREATE POLICY "Admins update assistance requests"
ON public.verification_assistance_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));
