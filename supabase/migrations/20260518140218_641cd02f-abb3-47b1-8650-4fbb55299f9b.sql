CREATE OR REPLACE FUNCTION public.find_chat_user(_email text DEFAULT NULL, _phone text DEFAULT NULL)
RETURNS TABLE(device_id text, display_name text, rufayq_id text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _hdr_device text;
  _phone_digits text;
  _phone_tail text;
BEGIN
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  IF _hdr_device IS NULL THEN RETURN; END IF;
  IF COALESCE(NULLIF(trim(_email), ''), NULLIF(trim(_phone), '')) IS NULL THEN RETURN; END IF;

  _phone_digits := NULLIF(regexp_replace(COALESCE(_phone, ''), '\D', '', 'g'), '');
  _phone_tail := CASE
    WHEN _phone_digits IS NULL THEN NULL
    WHEN length(_phone_digits) >= 9 THEN right(_phone_digits, 9)
    ELSE _phone_digits
  END;

  RETURN QUERY
  SELECT p.device_id,
         COALESCE(NULLIF(p.full_name_en,''), NULLIF(p.full_name_ar,''), p.rufayq_id) AS display_name,
         p.rufayq_id
  FROM public.profiles p
  WHERE p.deleted_at IS NULL
    AND p.device_id <> _hdr_device
    AND (
      (
        _email IS NOT NULL
        AND p.discoverable_by_email = true
        AND lower(COALESCE(NULLIF(p.email, ''), p.google_email)) = lower(trim(_email))
      )
      OR (
        _phone_tail IS NOT NULL
        AND p.discoverable_by_phone = true
        AND right(regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g'), 9) = _phone_tail
      )
    )
  LIMIT 5;
END $$;

CREATE OR REPLACE FUNCTION public.get_chat_discovery()
RETURNS TABLE(discoverable_by_email boolean, discoverable_by_phone boolean, email text, phone text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _hdr_device text;
BEGIN
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  IF _hdr_device IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT p.discoverable_by_email,
           p.discoverable_by_phone,
           COALESCE(NULLIF(p.email, ''), p.google_email) AS email,
           p.phone
    FROM public.profiles p
    WHERE p.device_id = _hdr_device
    LIMIT 1;
END $$;

UPDATE public.profiles
   SET email = google_email
 WHERE (email IS NULL OR email = '')
   AND google_email IS NOT NULL;