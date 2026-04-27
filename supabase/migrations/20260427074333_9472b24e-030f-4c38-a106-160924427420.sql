
-- Extend cms_global_settings with first-class contact fields so admins can
-- edit phone, address, and business hours from the Website CMS without
-- shoving them into the social_links JSON blob.
ALTER TABLE public.cms_global_settings
  ADD COLUMN IF NOT EXISTS support_phone TEXT,
  ADD COLUMN IF NOT EXISTS address_en TEXT,
  ADD COLUMN IF NOT EXISTS address_ar TEXT,
  ADD COLUMN IF NOT EXISTS business_hours_en TEXT,
  ADD COLUMN IF NOT EXISTS business_hours_ar TEXT,
  ADD COLUMN IF NOT EXISTS map_embed_url TEXT;
