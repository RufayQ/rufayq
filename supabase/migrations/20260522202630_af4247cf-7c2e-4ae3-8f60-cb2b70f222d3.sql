-- Extend realtime topic ACL to cover lounge + chat channels

DROP POLICY IF EXISTS "Device-scoped realtime topic read" ON realtime.messages;
DROP POLICY IF EXISTS "Device-scoped realtime topic write" ON realtime.messages;

CREATE OR REPLACE FUNCTION public._rt_device_id()
RETURNS text
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '')
$$;

CREATE OR REPLACE FUNCTION public._rt_topic_allowed(_topic text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dev text := public._rt_device_id();
  _parts text[];
  _thread uuid;
BEGIN
  IF _topic IS NULL OR _dev IS NULL THEN
    RETURN false;
  END IF;

  -- Device-owned topics
  IF _topic IN (
    'pn:'  || _dev,
    'pf:'  || _dev,
    'lm:'  || _dev,
    'ci:'  || _dev,
    'ga:'  || _dev
  ) THEN
    RETURN true;
  END IF;

  -- Thread-scoped chat topics: ct:<thread_uuid>:<device_id> / cr:<thread_uuid>:<device_id>
  IF _topic LIKE 'ct:%:%' OR _topic LIKE 'cr:%:%' THEN
    _parts := string_to_array(_topic, ':');
    IF array_length(_parts, 1) = 3 AND _parts[3] = _dev THEN
      BEGIN
        _thread := _parts[2]::uuid;
      EXCEPTION WHEN others THEN
        RETURN false;
      END;
      RETURN public.chat_caller_participates(_thread);
    END IF;
  END IF;

  RETURN false;
END $$;

CREATE POLICY "Device-scoped realtime topic read"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (public._rt_topic_allowed(realtime.topic()));

CREATE POLICY "Device-scoped realtime topic write"
ON realtime.messages
FOR INSERT
TO anon, authenticated
WITH CHECK (public._rt_topic_allowed(realtime.topic()));