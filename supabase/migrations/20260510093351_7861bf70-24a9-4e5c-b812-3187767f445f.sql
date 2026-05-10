-- Transport tickets and flight segments, scoped per-device (matches transport-attachments pattern)
CREATE TABLE IF NOT EXISTS public.transport_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  source_document_id UUID NULL,
  document_type TEXT NOT NULL DEFAULT 'flight_ticket',
  trip_type TEXT NOT NULL CHECK (trip_type IN ('one-way','round-trip','multi-city')),
  passenger_name TEXT NULL,
  passenger_passport TEXT NULL,
  booking_reference TEXT NULL,
  save_to_transport_timeline BOOLEAN NOT NULL DEFAULT true,
  save_to_medical_records BOOLEAN NOT NULL DEFAULT false,
  send_to_doctor BOOLEAN NOT NULL DEFAULT false,
  pending_segment_ref TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transport_flight_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.transport_tickets(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound','return')),
  segment_order INT NOT NULL,
  airline TEXT NULL,
  flight_number TEXT NULL,
  from_code TEXT NOT NULL,
  from_city TEXT NULL,
  from_country TEXT NULL,
  from_airport_name TEXT NULL,
  to_code TEXT NOT NULL,
  to_city TEXT NULL,
  to_country TEXT NULL,
  to_airport_name TEXT NULL,
  departure_date DATE NULL,
  departure_time TEXT NULL,
  arrival_date DATE NULL,
  arrival_time TEXT NULL,
  departure_terminal TEXT NULL,
  arrival_terminal TEXT NULL,
  cabin_class TEXT NULL,
  pnr TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_tickets_device ON public.transport_tickets(device_id);
CREATE INDEX IF NOT EXISTS idx_transport_segments_ticket ON public.transport_flight_segments(ticket_id);

ALTER TABLE public.transport_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_flight_segments ENABLE ROW LEVEL SECURITY;

-- Device-scoped access via x-device-id request header (matches transport_attachments)
CREATE POLICY "device can read own tickets"
  ON public.transport_tickets FOR SELECT
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "device can insert own tickets"
  ON public.transport_tickets FOR INSERT
  WITH CHECK (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "device can update own tickets"
  ON public.transport_tickets FOR UPDATE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "device can delete own tickets"
  ON public.transport_tickets FOR DELETE
  USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

CREATE POLICY "device can read own segments"
  ON public.transport_flight_segments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.transport_tickets t
    WHERE t.id = ticket_id
      AND t.device_id = current_setting('request.headers', true)::json->>'x-device-id'));

CREATE POLICY "device can insert own segments"
  ON public.transport_flight_segments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.transport_tickets t
    WHERE t.id = ticket_id
      AND t.device_id = current_setting('request.headers', true)::json->>'x-device-id'));

CREATE POLICY "device can update own segments"
  ON public.transport_flight_segments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.transport_tickets t
    WHERE t.id = ticket_id
      AND t.device_id = current_setting('request.headers', true)::json->>'x-device-id'));

CREATE POLICY "device can delete own segments"
  ON public.transport_flight_segments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.transport_tickets t
    WHERE t.id = ticket_id
      AND t.device_id = current_setting('request.headers', true)::json->>'x-device-id'));

CREATE TRIGGER trg_transport_tickets_updated_at
  BEFORE UPDATE ON public.transport_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();