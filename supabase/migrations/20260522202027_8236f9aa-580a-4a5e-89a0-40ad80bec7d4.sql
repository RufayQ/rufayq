
CREATE OR REPLACE FUNCTION public.sync_cron_secret_to_vault(_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE existing UUID;
BEGIN
  SELECT id INTO existing FROM vault.secrets WHERE name = 'CRON_SECRET' LIMIT 1;
  IF existing IS NULL THEN
    PERFORM vault.create_secret(_value, 'CRON_SECRET');
  ELSE
    PERFORM vault.update_secret(existing, _value, 'CRON_SECRET');
  END IF;
  RETURN TRUE;
END $$;

REVOKE ALL ON FUNCTION public.sync_cron_secret_to_vault(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_cron_secret_to_vault(TEXT) TO service_role;
