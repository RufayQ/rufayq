
ALTER TABLE public.transport_tickets
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.transport_flight_segments
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS fare_class text,
  ADD COLUMN IF NOT EXISTS baggage_allowance text,
  ADD COLUMN IF NOT EXISTS departure_gate text,
  ADD COLUMN IF NOT EXISTS arrival_gate text;

CREATE INDEX IF NOT EXISTS idx_transport_tickets_user
  ON public.transport_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_transport_segments_user
  ON public.transport_flight_segments(user_id);

DROP POLICY IF EXISTS "device can read own tickets" ON public.transport_tickets;
DROP POLICY IF EXISTS "device can insert own tickets" ON public.transport_tickets;
DROP POLICY IF EXISTS "device can update own tickets" ON public.transport_tickets;
DROP POLICY IF EXISTS "device can delete own tickets" ON public.transport_tickets;

CREATE POLICY "owner can read tickets"
ON public.transport_tickets FOR SELECT
USING (
  device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY "owner can insert tickets"
ON public.transport_tickets FOR INSERT
WITH CHECK (
  device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY "owner can update tickets"
ON public.transport_tickets FOR UPDATE
USING (
  device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY "owner can delete tickets"
ON public.transport_tickets FOR DELETE
USING (
  device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "device can read own segments" ON public.transport_flight_segments;
DROP POLICY IF EXISTS "device can insert own segments" ON public.transport_flight_segments;
DROP POLICY IF EXISTS "device can update own segments" ON public.transport_flight_segments;
DROP POLICY IF EXISTS "device can delete own segments" ON public.transport_flight_segments;

CREATE POLICY "owner can read segments"
ON public.transport_flight_segments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transport_tickets t
    WHERE t.id = transport_flight_segments.ticket_id
      AND (
        t.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
        OR (t.user_id IS NOT NULL AND t.user_id = auth.uid())
      )
  )
);

CREATE POLICY "owner can insert segments"
ON public.transport_flight_segments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transport_tickets t
    WHERE t.id = transport_flight_segments.ticket_id
      AND (
        t.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
        OR (t.user_id IS NOT NULL AND t.user_id = auth.uid())
      )
  )
);

CREATE POLICY "owner can update segments"
ON public.transport_flight_segments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.transport_tickets t
    WHERE t.id = transport_flight_segments.ticket_id
      AND (
        t.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
        OR (t.user_id IS NOT NULL AND t.user_id = auth.uid())
      )
  )
);

CREATE POLICY "owner can delete segments"
ON public.transport_flight_segments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.transport_tickets t
    WHERE t.id = transport_flight_segments.ticket_id
      AND (
        t.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
        OR (t.user_id IS NOT NULL AND t.user_id = auth.uid())
      )
  )
);
