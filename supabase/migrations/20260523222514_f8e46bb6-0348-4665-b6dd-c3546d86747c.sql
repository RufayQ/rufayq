ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS city_of_residence text,
  ADD COLUMN IF NOT EXISTS occupation text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_marital_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_marital_status_check
  CHECK (marital_status IS NULL OR marital_status IN ('single','married','divorced','widowed'));