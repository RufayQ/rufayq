CREATE OR REPLACE FUNCTION public.chat_unread_counts_for_device(_device_id text)
RETURNS TABLE(thread_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.thread_id, COUNT(*)::bigint AS unread_count
  FROM public.chat_participants p
  JOIN public.chat_messages m ON m.thread_id = p.thread_id
  WHERE p.device_id = _device_id
    AND m.deleted_at IS NULL
    AND (m.sender_device_id IS DISTINCT FROM _device_id)
    AND m.created_at > COALESCE(p.last_read_at, 'epoch'::timestamptz)
  GROUP BY m.thread_id;
$$;