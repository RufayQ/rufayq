CREATE OR REPLACE FUNCTION public._hdr_device_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
$$;