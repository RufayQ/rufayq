CREATE POLICY "Device updates own profile" ON public.profiles
FOR UPDATE
USING (device_id IS NOT NULL AND device_id <> '' AND device_id = ((current_setting('request.headers'::text, true))::json ->> 'x-device-id'))
WITH CHECK (device_id = ((current_setting('request.headers'::text, true))::json ->> 'x-device-id'));