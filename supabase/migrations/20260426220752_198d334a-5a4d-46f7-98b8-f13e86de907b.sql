
-- 1. Extend payment_receipts state machine + reference + channel + messages
ALTER TABLE public.payment_receipts
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS submission_channel TEXT NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS patient_message TEXT,
  ADD COLUMN IF NOT EXISTS internal_note TEXT,
  ADD COLUMN IF NOT EXISTS transfer_date DATE,
  ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Tighten status check
DO $$ BEGIN
  ALTER TABLE public.payment_receipts DROP CONSTRAINT IF EXISTS payment_receipts_status_check;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.payment_receipts
  ADD CONSTRAINT payment_receipts_status_check
  CHECK (status IN ('pending','under_review','verified','rejected','needs_more_info'));

ALTER TABLE public.payment_receipts
  ADD CONSTRAINT payment_receipts_channel_check
  CHECK (submission_channel IN ('app','whatsapp','email','admin'));

CREATE INDEX IF NOT EXISTS idx_payment_receipts_device_status ON public.payment_receipts(device_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_reference ON public.payment_receipts(payment_reference);

-- Auto-generate RFQ-PAY-YYYYMMDD-XXXXX reference if missing
CREATE OR REPLACE FUNCTION public.assign_payment_reference()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.payment_reference IS NULL OR NEW.payment_reference = '' THEN
    NEW.payment_reference := 'RFQ-PAY-' || to_char(now() AT TIME ZONE 'UTC','YYYYMMDD')
      || '-' || LPAD(FLOOR(RANDOM()*100000)::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_payment_reference ON public.payment_receipts;
CREATE TRIGGER trg_assign_payment_reference
  BEFORE INSERT ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.assign_payment_reference();

-- 2. Subscription event log (per-device audit trail / patient timeline)
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES public.payment_receipts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  actor_id UUID,
  actor_role TEXT,
  notes TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_device ON public.subscription_events(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_sub ON public.subscription_events(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_receipt ON public.subscription_events(receipt_id, created_at DESC);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Patient (anon) can read their own device's timeline via x-device-id header
DROP POLICY IF EXISTS "Device can view own subscription events" ON public.subscription_events;
CREATE POLICY "Device can view own subscription events"
  ON public.subscription_events FOR SELECT
  USING (device_id = current_setting('request.headers', true)::json ->> 'x-device-id');

DROP POLICY IF EXISTS "Admins can view all subscription events" ON public.subscription_events;
CREATE POLICY "Admins can view all subscription events"
  ON public.subscription_events FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "Admins can insert subscription events" ON public.subscription_events;
CREATE POLICY "Admins can insert subscription events"
  ON public.subscription_events FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator') OR auth.uid() IS NULL);

-- 3. Auto-log events on receipt status changes
CREATE OR REPLACE FUNCTION public.log_receipt_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_events(device_id, receipt_id, event_type, to_value, actor_id, notes, details)
    VALUES (NEW.device_id, NEW.id, 'receipt_uploaded', NEW.status, NEW.reviewer_id,
      'Receipt submitted via ' || NEW.submission_channel,
      jsonb_build_object('plan',NEW.requested_plan,'amount',NEW.amount,'currency',NEW.currency,
                         'channel',NEW.submission_channel,'reference',NEW.payment_reference));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.subscription_events(device_id, receipt_id, event_type, from_value, to_value,
      actor_id, notes, details)
    VALUES (NEW.device_id, NEW.id,
      CASE NEW.status
        WHEN 'verified' THEN 'payment_approved'
        WHEN 'rejected' THEN 'payment_rejected'
        WHEN 'under_review' THEN 'review_started'
        WHEN 'needs_more_info' THEN 'more_info_requested'
        ELSE 'receipt_status_changed' END,
      OLD.status, NEW.status, NEW.reviewer_id, NEW.patient_message,
      jsonb_build_object('reviewer_notes',NEW.reviewer_notes,'internal_note',NEW.internal_note));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_receipt_event ON public.payment_receipts;
CREATE TRIGGER trg_log_receipt_event
  AFTER INSERT OR UPDATE ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.log_receipt_event();

-- 4. Auto-log subscription activation / cancellation
CREATE OR REPLACE FUNCTION public.log_subscription_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_events(device_id, subscription_id, event_type, to_value, actor_id, details)
    VALUES (NEW.device_id, NEW.id, 'subscription_created', NEW.status, NEW.activated_by,
      jsonb_build_object('plan',NEW.plan,'cycle',NEW.billing_cycle,'amount',NEW.amount));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.subscription_events(device_id, subscription_id, event_type, from_value, to_value, actor_id, details)
    VALUES (NEW.device_id, NEW.id, 'subscription_status_changed', OLD.status, NEW.status, NEW.activated_by,
      jsonb_build_object('plan',NEW.plan));
  ELSIF NEW.plan IS DISTINCT FROM OLD.plan THEN
    INSERT INTO public.subscription_events(device_id, subscription_id, event_type, from_value, to_value, actor_id)
    VALUES (NEW.device_id, NEW.id, 'plan_changed', OLD.plan, NEW.plan, NEW.activated_by);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_subscription_event ON public.user_subscriptions;
CREATE TRIGGER trg_log_subscription_event
  AFTER INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_event();
