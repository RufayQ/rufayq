-- Fix 1: user_trials — remove public read, scope to device owner via header, plus admin
DROP POLICY IF EXISTS "Anyone can read trials" ON public.user_trials;

-- Allow a device to read only its own trial row by passing its device_id
-- via the request header `x-device-id` (set client-side).
CREATE POLICY "Device reads own trial"
ON public.user_trials FOR SELECT
TO public
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "Admins read all trials"
ON public.user_trials FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: otp_send_log — explicitly deny all client INSERTs.
-- Inserts happen only from the send-otp edge function using the service role,
-- which bypasses RLS. This restrictive policy makes the intent explicit.
CREATE POLICY "No client inserts to otp log"
ON public.otp_send_log AS RESTRICTIVE FOR INSERT
TO public, authenticated
WITH CHECK (false);