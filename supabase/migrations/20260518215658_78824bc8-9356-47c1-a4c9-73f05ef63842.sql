ALTER TABLE public.transport_attachments
  ADD COLUMN IF NOT EXISTS key_fields jsonb,
  ADD COLUMN IF NOT EXISTS subcategory text;