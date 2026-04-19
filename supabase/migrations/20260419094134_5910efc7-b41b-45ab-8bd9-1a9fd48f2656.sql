
-- profiles: lock down SELECT/UPDATE
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

CREATE POLICY "Admins read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- medical_profiles: lock down SELECT/UPDATE
DROP POLICY IF EXISTS "Anyone can read medical profiles" ON public.medical_profiles;
DROP POLICY IF EXISTS "Anyone can update medical profiles" ON public.medical_profiles;

CREATE POLICY "Admins read all medical profiles"
ON public.medical_profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update medical profiles"
ON public.medical_profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_trials: drop permissive UPDATE; keep SELECT/INSERT (non-sensitive, used by hook)
DROP POLICY IF EXISTS "Anyone can update trials" ON public.user_trials;

CREATE POLICY "Admins update trials"
ON public.user_trials FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
