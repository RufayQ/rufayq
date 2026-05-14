ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_verification_status TEXT NOT NULL DEFAULT 'pending';