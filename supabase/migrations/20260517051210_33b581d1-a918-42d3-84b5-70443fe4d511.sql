
-- 1. Track which device each push token belongs to so we can resolve push tokens
--    for chat recipients (chat is keyed by device_id, push tokens were keyed by user_id only).
ALTER TABLE public.device_push_tokens
  ADD COLUMN IF NOT EXISTS device_id text;

CREATE INDEX IF NOT EXISTS device_push_tokens_device_idx
  ON public.device_push_tokens(device_id)
  WHERE device_id IS NOT NULL;

-- 2. Make sure pg_net is available for trigger -> edge function dispatch.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3. Trigger function: on every new chat message, asynchronously invoke the
--    chat-push edge function. The edge function performs all suppression and
--    FCM delivery so we keep this lean and non-blocking.
CREATE OR REPLACE FUNCTION public.chat_message_dispatch_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _url text := 'https://dlzwgkdiqabapgnvufil.supabase.co/functions/v1/chat-push';
BEGIN
  -- Soft-deleted or system replays: skip.
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('message_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block message insert because of push problems.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_message_dispatch_push ON public.chat_messages;
CREATE TRIGGER trg_chat_message_dispatch_push
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.chat_message_dispatch_push();
