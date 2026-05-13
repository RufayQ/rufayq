-- 1. transport_attachments: device-scoped policies
DROP POLICY IF EXISTS "Anyone read transport attachments"   ON public.transport_attachments;
DROP POLICY IF EXISTS "Anyone insert transport attachments" ON public.transport_attachments;
DROP POLICY IF EXISTS "Anyone delete transport attachments" ON public.transport_attachments;

CREATE POLICY "Device can read own transport attachments"
ON public.transport_attachments FOR SELECT
USING (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

CREATE POLICY "Device can insert own transport attachments"
ON public.transport_attachments FOR INSERT
WITH CHECK (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

CREATE POLICY "Device can update own transport attachments"
ON public.transport_attachments FOR UPDATE
USING (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
WITH CHECK (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

CREATE POLICY "Device can delete own transport attachments"
ON public.transport_attachments FOR DELETE
USING (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- 2. transport-attachments storage bucket: scope to device folder
DROP POLICY IF EXISTS "Anyone read own transport attachments"    ON storage.objects;
DROP POLICY IF EXISTS "Anyone upload transport attachments"      ON storage.objects;
DROP POLICY IF EXISTS "Anyone delete own transport attachments"  ON storage.objects;

CREATE POLICY "Device can read own transport-attachments files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transport-attachments'
  AND (storage.foldername(name))[1] = ((current_setting('request.headers', true))::json ->> 'x-device-id')
);

CREATE POLICY "Device can upload own transport-attachments files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transport-attachments'
  AND (storage.foldername(name))[1] = ((current_setting('request.headers', true))::json ->> 'x-device-id')
);

CREATE POLICY "Device can delete own transport-attachments files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'transport-attachments'
  AND (storage.foldername(name))[1] = ((current_setting('request.headers', true))::json ->> 'x-device-id')
);

-- 3. subscription_events: remove anonymous insert loophole
DROP POLICY IF EXISTS "Admins can insert subscription events" ON public.subscription_events;
CREATE POLICY "Admins can insert subscription events"
ON public.subscription_events FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- 4. wallet_audit_log: drop permissive client-facing INSERT policy.
-- audit_wallet_payout trigger runs SECURITY DEFINER and bypasses RLS.
DROP POLICY IF EXISTS "System inserts wallet audit" ON public.wallet_audit_log;

-- 5. OTP attempt rate-limit table
CREATE TABLE IF NOT EXISTS public.otp_verify_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient   text NOT NULL,
  ip_address  text,
  attempt_at  timestamptz NOT NULL DEFAULT now(),
  succeeded   boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_otp_attempts_recipient_time
  ON public.otp_verify_attempts (recipient, attempt_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_attempts_ip_time
  ON public.otp_verify_attempts (ip_address, attempt_at DESC);

ALTER TABLE public.otp_verify_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read otp attempts"
ON public.otp_verify_attempts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));