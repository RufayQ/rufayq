DROP POLICY IF EXISTS "anyone can submit reviews" ON public.app_reviews;
DROP POLICY IF EXISTS "anon can submit reviews" ON public.app_reviews;
DROP POLICY IF EXISTS "public can submit reviews" ON public.app_reviews;
DROP POLICY IF EXISTS "device can insert reviews" ON public.app_reviews;
DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.app_reviews;
DROP POLICY IF EXISTS "Users can insert reviews" ON public.app_reviews;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='app_reviews' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.app_reviews', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "reviews insert pending only"
ON public.app_reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (
  approved = false
  AND (device_id IS NULL OR device_id = (current_setting('request.headers', true)::json ->> 'x-device-id'))
);