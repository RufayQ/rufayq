-- 1. Optional account link on participant rows
ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_participants_user
  ON public.chat_participants(user_id)
  WHERE user_id IS NOT NULL;

-- 2. Auto-stamp user_id from auth context on insert / update
CREATE OR REPLACE FUNCTION public.chat_participants_stamp_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_participants_stamp_user ON public.chat_participants;
CREATE TRIGGER trg_chat_participants_stamp_user
BEFORE INSERT OR UPDATE ON public.chat_participants
FOR EACH ROW EXECUTE FUNCTION public.chat_participants_stamp_user();

-- 3. Backfill: any existing participant row that matches the current auth.uid()
--    will be stamped on its next update. No bulk backfill possible without a
--    device_id -> user_id mapping in profiles.

-- 4. Loosen UPDATE policy so a signed-in user can mark-read on a different
--    device than the one that created the participant row.
DROP POLICY IF EXISTS "Participants update own row" ON public.chat_participants;
CREATE POLICY "Participants update own row"
ON public.chat_participants
FOR UPDATE
USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (device_id IS NOT NULL AND device_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), ''))
  OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
);

-- 5. New unread-count RPC: aggregate last_read_at across every participant row
--    that belongs to the same account (or falls back to the device id for guests).
CREATE OR REPLACE FUNCTION public.chat_unread_counts_for_device(
  _device_id text,
  _user_id   uuid DEFAULT NULL
)
RETURNS TABLE(thread_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_parts AS (
    SELECT p.thread_id, p.last_read_at, p.device_id
    FROM public.chat_participants p
    WHERE (_user_id   IS NOT NULL AND p.user_id   = _user_id)
       OR (_device_id IS NOT NULL AND p.device_id = _device_id)
  ),
  per_thread AS (
    SELECT thread_id,
           MAX(COALESCE(last_read_at, 'epoch'::timestamptz)) AS since
    FROM my_parts
    GROUP BY thread_id
  ),
  my_devices AS (
    SELECT DISTINCT device_id FROM my_parts WHERE device_id IS NOT NULL
  )
  SELECT m.thread_id, COUNT(*)::bigint AS unread_count
  FROM per_thread pt
  JOIN public.chat_messages m ON m.thread_id = pt.thread_id
  WHERE m.deleted_at IS NULL
    AND m.created_at > pt.since
    AND (_user_id IS NULL OR m.sender_user_id IS DISTINCT FROM _user_id)
    AND (m.sender_device_id IS NULL OR m.sender_device_id NOT IN (SELECT device_id FROM my_devices))
  GROUP BY m.thread_id;
$$;