-- 1. Fix chat_caller_participates: add user_id branch + scope org check to caller's own org
CREATE OR REPLACE FUNCTION public.chat_caller_participates(_thread_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _hdr_device text;
  _uid uuid;
BEGIN
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  _uid := auth.uid();
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = _thread_id
      AND (
        (_hdr_device IS NOT NULL AND cp.device_id = _hdr_device)
        OR (_uid IS NOT NULL AND cp.user_id = _uid)
        OR (
          _uid IS NOT NULL
          AND cp.organization_id IS NOT NULL
          AND public.is_org_member(_uid, cp.organization_id)
          AND EXISTS (
            SELECT 1 FROM public.chat_participants cp2
            WHERE cp2.thread_id = _thread_id
              AND cp2.organization_id = cp.organization_id
              AND public.is_org_member(_uid, cp2.organization_id)
          )
        )
      )
  );
END $function$;

-- 2. Add in-DB rate limit to consume_manual_otp (max 8 failed attempts per recipient per 15 min)
CREATE OR REPLACE FUNCTION public.consume_manual_otp(_recipient text, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row_id UUID;
  _recent_failures INT;
BEGIN
  -- In-DB rate limit (defense-in-depth in case caller bypasses the edge function).
  SELECT COUNT(*) INTO _recent_failures
  FROM public.otp_verify_attempts
  WHERE recipient = _recipient
    AND succeeded = false
    AND attempt_at > now() - interval '15 minutes';
  IF _recent_failures >= 8 THEN
    RETURN FALSE;
  END IF;

  SELECT id INTO _row_id FROM public.manual_otp_codes
  WHERE recipient = _recipient AND code = _code AND used_at IS NULL AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1;

  IF _row_id IS NULL THEN
    -- Log the failed attempt for rate limiting (bypassing the RESTRICTIVE policy via SECURITY DEFINER).
    INSERT INTO public.otp_verify_attempts(recipient, succeeded) VALUES (_recipient, false);
    RETURN FALSE;
  END IF;

  UPDATE public.manual_otp_codes SET used_at = now() WHERE id = _row_id;
  INSERT INTO public.otp_verify_attempts(recipient, succeeded) VALUES (_recipient, true);
  PERFORM public.log_audit_event('manual_otp_consumed','recipient',_recipient,jsonb_build_object('otp_id',_row_id));
  RETURN TRUE;
END;
$function$;

-- 3. Lock subscription_addons writes to admin-only; users may only SELECT their own rows.
DROP POLICY IF EXISTS "User manages own addons" ON public.subscription_addons;

CREATE POLICY "Users read own addons"
ON public.subscription_addons
FOR SELECT
TO authenticated
USING (user_id = auth.uid());