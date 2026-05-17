-- Add per-thread mute toggle on chat_participants. Mute is scoped to a
-- participant row (i.e. one device/account) so muting on one device does
-- not affect notifications on another unless the user re-syncs.
ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS muted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_participants_muted
  ON public.chat_participants (thread_id)
  WHERE muted = true;

-- RPC: mark a thread unread for the caller (device + optional signed-in
-- user). Sets last_read_at to just before the latest message in that
-- thread so the unread RPC reports >= 1 message unread. If there are no
-- messages in the thread, last_read_at is set to NULL.
CREATE OR REPLACE FUNCTION public.chat_mark_thread_unread(
  _thread_id uuid,
  _device_id text,
  _user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last timestamptz;
  v_target timestamptz;
BEGIN
  SELECT max(created_at) INTO v_last
  FROM public.chat_messages
  WHERE thread_id = _thread_id AND deleted_at IS NULL;

  IF v_last IS NULL THEN
    v_target := NULL;
  ELSE
    v_target := v_last - interval '1 millisecond';
  END IF;

  UPDATE public.chat_participants
  SET last_read_at = v_target
  WHERE thread_id = _thread_id
    AND (
      (device_id IS NOT NULL AND device_id = _device_id)
      OR (_user_id IS NOT NULL AND user_id = _user_id)
    );
END;
$$;

-- RPC: toggle mute for the caller's participant rows on a thread.
CREATE OR REPLACE FUNCTION public.chat_set_thread_muted(
  _thread_id uuid,
  _device_id text,
  _muted boolean,
  _user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_participants
  SET muted = _muted
  WHERE thread_id = _thread_id
    AND (
      (device_id IS NOT NULL AND device_id = _device_id)
      OR (_user_id IS NOT NULL AND user_id = _user_id)
    );
END;
$$;