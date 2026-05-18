ALTER TABLE public.lounge_memberships
  ADD COLUMN IF NOT EXISTS qr_secret TEXT,
  ADD COLUMN IF NOT EXISTS entitlement_refresh_on DATE,
  ADD COLUMN IF NOT EXISTS qr_image_url TEXT;