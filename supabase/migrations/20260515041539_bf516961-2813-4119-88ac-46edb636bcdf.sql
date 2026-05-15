ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_email TEXT,
  ADD COLUMN IF NOT EXISTS google_sub TEXT,
  ADD COLUMN IF NOT EXISTS google_linked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auth_providers TEXT[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_profiles_google_sub ON public.profiles(google_sub) WHERE google_sub IS NOT NULL;