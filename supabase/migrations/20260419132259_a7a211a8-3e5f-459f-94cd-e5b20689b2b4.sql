
-- 1. support_tickets: add device_id binding so submitters can read their own tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS device_id text;

CREATE INDEX IF NOT EXISTS idx_support_tickets_device ON public.support_tickets(device_id);

-- Tighten INSERT: require device_id on row to match header
DROP POLICY IF EXISTS "Device creates ticket" ON public.support_tickets;
CREATE POLICY "Device creates ticket" ON public.support_tickets
  FOR INSERT TO public
  WITH CHECK (
    device_id IS NOT NULL
    AND device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );

-- New SELECT: submitter can read their own tickets
CREATE POLICY "Device reads own tickets" ON public.support_tickets
  FOR SELECT TO public
  USING (
    device_id IS NOT NULL
    AND device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );

-- 2. user_roles: explicit RESTRICTIVE INSERT for authenticated role (defense in depth)
DROP POLICY IF EXISTS "Block non-admin role inserts authenticated" ON public.user_roles;
CREATE POLICY "Block non-admin role inserts authenticated" ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Same for UPDATE/DELETE — only admins can change role assignments
DROP POLICY IF EXISTS "Block non-admin role updates" ON public.user_roles;
CREATE POLICY "Block non-admin role updates" ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Block non-admin role deletes" ON public.user_roles;
CREATE POLICY "Block non-admin role deletes" ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. user_trials: add an auth.uid() backed read for signed-in users (post-login path)
-- The device-header read stays for the pre-login path. Trial records contain only
-- non-sensitive metadata (start/end timestamp, plan name).
CREATE POLICY "Auth user reads own trial via profile" ON public.user_trials
  FOR SELECT TO authenticated
  USING (
    device_id IN (
      SELECT device_id FROM public.profiles
      WHERE id IN (
        SELECT id FROM public.profiles
        WHERE device_id = user_trials.device_id
      )
    )
  );
