CREATE OR REPLACE FUNCTION public.chat_message_dispatch_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _url text := 'https://dlzwgkdiqabapgnvufil.supabase.co/functions/v1/chat-push';
  _secret text;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO _secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(_secret, '')
    ),
    body := jsonb_build_object('message_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;