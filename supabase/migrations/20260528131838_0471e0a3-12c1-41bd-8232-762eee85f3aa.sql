-- Extend realtime topic ACL to cover all per-device/per-thread channels used by the app
-- so every subscription is scoped by topic in addition to table-level RLS.

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

  -- Device-owned topics (notifications, provider feed, lounge memberships,
  -- chat inbox, global activity, pending claims, claims list)
  IF _topic IN (
    'pn:'      || _dev,
    'pf:'      || _dev,
    'lm:'      || _dev,
    'ci:'      || _dev,
    'ga:'      || _dev,
    'pc:'      || _dev,
    'pc-list:' || _dev
  ) THEN
    RETURN true;
  END IF;

  -- Thread-scoped chat topics: ct:<thread>:<device>, cr:<thread>:<device>
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

  -- Thread-scoped reactions topic: rx:<thread>
  IF _topic LIKE 'rx:%' THEN
    _parts := string_to_array(_topic, ':');
    IF array_length(_parts, 1) = 2 THEN
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