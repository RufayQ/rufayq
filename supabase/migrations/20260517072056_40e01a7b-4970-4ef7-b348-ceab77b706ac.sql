CREATE TABLE public.lounge_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  device_id TEXT,
  program TEXT NOT NULL,
  membership_number TEXT NOT NULL,
  cardholder_name TEXT NOT NULL,
  card_last4 TEXT,
  expires_on DATE,
  linked_segment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_lounge_memberships_user ON public.lounge_memberships(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lounge_memberships_device ON public.lounge_memberships(device_id) WHERE deleted_at IS NULL;

ALTER TABLE public.lounge_memberships ENABLE ROW LEVEL SECURITY;

-- Helper to read device id from request header (mirrors transport_attachments pattern)
CREATE OR REPLACE FUNCTION public._hdr_device_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
$$;

CREATE POLICY "Owners select lounge memberships"
ON public.lounge_memberships FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (user_id IS NULL AND device_id IS NOT NULL AND device_id = public._hdr_device_id())
);

CREATE POLICY "Owners insert lounge memberships"
ON public.lounge_memberships FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.uid() IS NULL AND user_id IS NULL AND device_id IS NOT NULL AND device_id = public._hdr_device_id())
);

CREATE POLICY "Owners update lounge memberships"
ON public.lounge_memberships FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (user_id IS NULL AND device_id IS NOT NULL AND device_id = public._hdr_device_id())
);

CREATE POLICY "Owners delete lounge memberships"
ON public.lounge_memberships FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (user_id IS NULL AND device_id IS NOT NULL AND device_id = public._hdr_device_id())
);

CREATE TRIGGER trg_lounge_memberships_updated_at
BEFORE UPDATE ON public.lounge_memberships
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.lounge_memberships;
ALTER TABLE public.lounge_memberships REPLICA IDENTITY FULL;