
-- 1. Receipts: device-scoped insert + select
CREATE POLICY "Anyone can submit receipts for their device"
ON public.payment_receipts FOR INSERT TO anon, authenticated
WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "Anyone reads their own receipts"
ON public.payment_receipts FOR SELECT TO anon, authenticated
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- 2. user_subscriptions: device-scoped read so client can show plan
CREATE POLICY "Anyone reads their own subscription"
ON public.user_subscriptions FOR SELECT TO anon, authenticated
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- 3. Storage: device-scoped uploads + reads under {device_id}/...
CREATE POLICY "Device can upload to its receipts folder"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = current_setting('request.headers', true)::json->>'x-device-id'
);

CREATE POLICY "Device can read its own receipts"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (storage.foldername(name))[1] = current_setting('request.headers', true)::json->>'x-device-id'
);

-- 4. Admin AI usage audit view (today + yesterday window)
CREATE OR REPLACE VIEW public.ai_usage_audit AS
SELECT
  u.device_id,
  u.usage_day,
  u.count,
  u.last_prompt_at,
  COALESCE(t.plan, 'trial') AS plan,
  CASE COALESCE(t.plan, 'trial')
    WHEN 'trial'     THEN 5
    WHEN 'basic'     THEN 25
    WHEN 'companion' THEN 50
    WHEN 'family'    THEN 100
    WHEN 'premium'   THEN 200
    ELSE 5
  END AS daily_limit,
  ((u.usage_day + INTERVAL '1 day')::timestamp AT TIME ZONE 'UTC') AS resets_at
FROM public.ai_usage u
LEFT JOIN public.user_trials t ON t.device_id = u.device_id
WHERE u.usage_day >= (now() AT TIME ZONE 'UTC')::date - INTERVAL '7 days';

GRANT SELECT ON public.ai_usage_audit TO authenticated;
