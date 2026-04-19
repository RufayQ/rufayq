
-- 1. Add provider_type for KPI grouping + filter
DO $$ BEGIN
  CREATE TYPE public.provider_type AS ENUM ('patient','hospital','physician','vendor','insurance','internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS provider_type public.provider_type NOT NULL DEFAULT 'patient';

CREATE INDEX IF NOT EXISTS idx_profiles_provider_type ON public.profiles(provider_type);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);

-- 2. Lock down "Anyone can insert" — require x-device-id header to match row
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
CREATE POLICY "Device inserts own profile" ON public.profiles
  FOR INSERT TO public
  WITH CHECK (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

DROP POLICY IF EXISTS "Anyone can insert medical profiles" ON public.medical_profiles;
CREATE POLICY "Device inserts own medical profile" ON public.medical_profiles
  FOR INSERT TO public
  WITH CHECK (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- Device can read+update its own medical profile (was admin-only before)
CREATE POLICY "Device reads own medical profile" ON public.medical_profiles
  FOR SELECT TO public
  USING (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

CREATE POLICY "Device updates own medical profile" ON public.medical_profiles
  FOR UPDATE TO public
  USING (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))
  WITH CHECK (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

DROP POLICY IF EXISTS "Anyone can create trials" ON public.user_trials;
CREATE POLICY "Device inserts own trial" ON public.user_trials
  FOR INSERT TO public
  WITH CHECK (device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.app_reviews;
CREATE POLICY "Device inserts own review" ON public.app_reviews
  FOR INSERT TO public
  WITH CHECK (
    device_id IS NULL
    OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );

DROP POLICY IF EXISTS "Anyone can create tickets" ON public.support_tickets;
CREATE POLICY "Device creates ticket" ON public.support_tickets
  FOR INSERT TO public
  WITH CHECK ((current_setting('request.headers', true))::json ->> 'x-device-id' IS NOT NULL);

-- 3. Defense-in-depth: restrictive policy blocking any non-admin role insert on user_roles
CREATE POLICY "Block non-admin role inserts" ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT TO public
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. KPI function: counts grouped by provider_type, with new-joiner windows
CREATE OR REPLACE FUNCTION public.admin_user_kpis()
RETURNS TABLE(
  provider_type text,
  total bigint,
  new_7d bigint,
  new_30d bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.provider_type::text,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE p.created_at > now() - interval '7 days')::bigint AS new_7d,
    COUNT(*) FILTER (WHERE p.created_at > now() - interval '30 days')::bigint AS new_30d
  FROM public.profiles p
  WHERE p.deleted_at IS NULL
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  GROUP BY p.provider_type
  ORDER BY total DESC;
$$;
