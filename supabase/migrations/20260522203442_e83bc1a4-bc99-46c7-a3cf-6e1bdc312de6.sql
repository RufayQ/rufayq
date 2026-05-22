DROP POLICY IF EXISTS "Anyone can upload to their device folder" ON storage.objects;

CREATE OR REPLACE FUNCTION public.tg_security_findings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;