-- 1) user_subscription_addons: owner SELECT
CREATE POLICY "Users can view their own subscription addons"
ON public.user_subscription_addons
FOR SELECT
TO authenticated
USING (
  subscription_id IN (
    SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
  )
);

-- 2) refund_disputes: device SELECT for guests
CREATE POLICY "Device users can view their own refund disputes"
ON public.refund_disputes
FOR SELECT
USING (
  device_id IS NOT NULL
  AND device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
);

-- 3) Extend _rt_topic_allowed to permit user-scoped lounge channel lmu:<user_id>
CREATE OR REPLACE FUNCTION public._rt_topic_allowed(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _device_id text;
  _uid uuid;
BEGIN
  _device_id := (current_setting('request.headers', true)::json ->> 'x-device-id');
  _uid := auth.uid();

  -- Device-scoped lounge memberships topic
  IF _topic LIKE 'lm:%' THEN
    RETURN _device_id IS NOT NULL AND _topic = ('lm:' || _device_id);
  END IF;

  -- User-scoped lounge memberships topic (authenticated users)
  IF _topic LIKE 'lmu:%' THEN
    RETURN _uid IS NOT NULL AND _topic = ('lmu:' || _uid::text);
  END IF;

  RETURN false;
END;
$$;
