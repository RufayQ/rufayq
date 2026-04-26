
-- =====================================================================
-- 1. user_subscriptions
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('trial','basic','companion','family','premium')),
  status TEXT NOT NULL DEFAULT 'pending_receipt'
    CHECK (status IN ('pending_receipt','active','expired','cancelled','rejected')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','quarterly','yearly')),
  amount NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'SAR',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  provider TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual','stripe')),
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_device ON public.user_subscriptions(device_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON public.user_subscriptions(current_period_end);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_subscriptions_active
  ON public.user_subscriptions(device_id) WHERE status = 'active';

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins manage all subscriptions" ON public.user_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Moderators read all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Moderators read all subscriptions" ON public.user_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'moderator'));

DROP TRIGGER IF EXISTS set_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER set_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 2. payment_receipts
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  requested_plan TEXT NOT NULL CHECK (requested_plan IN ('basic','companion','family','premium')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','quarterly','yearly')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer','stc_pay','mada','apple_pay','other')),
  reference_no TEXT,
  receipt_file_path TEXT,
  payer_name TEXT,
  payer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_device ON public.payment_receipts(device_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_status ON public.payment_receipts(status);

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage all receipts" ON public.payment_receipts;
CREATE POLICY "Admins manage all receipts" ON public.payment_receipts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Moderators read all receipts" ON public.payment_receipts;
CREATE POLICY "Moderators read all receipts" ON public.payment_receipts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'moderator'));

DROP TRIGGER IF EXISTS set_payment_receipts_updated_at ON public.payment_receipts;
CREATE TRIGGER set_payment_receipts_updated_at BEFORE UPDATE ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 3. subscription_addons (already exists from earlier session — align schema)
-- =====================================================================
ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage all addons" ON public.subscription_addons;
CREATE POLICY "Admins manage all addons" ON public.subscription_addons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Moderators read all addons" ON public.subscription_addons;
CREATE POLICY "Moderators read all addons" ON public.subscription_addons FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'moderator'));

-- =====================================================================
-- 4. Storage bucket for receipt uploads
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('payment-receipts', 'payment-receipts', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read all payment receipts" ON storage.objects;
CREATE POLICY "Admins read all payment receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins upload payment receipts" ON storage.objects;
CREATE POLICY "Admins upload payment receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins delete payment receipts" ON storage.objects;
CREATE POLICY "Admins delete payment receipts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(),'admin'));

-- =====================================================================
-- 5. Atomic AI credit consumption (race-safe)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.consume_ai_credit(_device_id TEXT, _daily_limit INT)
RETURNS TABLE (allowed BOOLEAN, new_count INT, daily_limit INT, resets_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
  _new_count INT;
  _resets TIMESTAMPTZ := ((_today + INTERVAL '1 day')::timestamp AT TIME ZONE 'UTC');
BEGIN
  INSERT INTO public.ai_usage(device_id, usage_day, count, last_prompt_at)
    VALUES (_device_id, _today, 1, now())
  ON CONFLICT (device_id, usage_day)
    DO UPDATE SET count = ai_usage.count + 1, last_prompt_at = now()
  RETURNING ai_usage.count INTO _new_count;

  IF _new_count > _daily_limit THEN
    UPDATE public.ai_usage SET count = count - 1
     WHERE device_id = _device_id AND usage_day = _today;
    RETURN QUERY SELECT false, _daily_limit, _daily_limit, _resets;
  ELSE
    RETURN QUERY SELECT true, _new_count, _daily_limit, _resets;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.consume_ai_credit(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(TEXT, INT) TO service_role;

-- =====================================================================
-- 6. Sync user_subscriptions -> user_trials
-- =====================================================================
CREATE OR REPLACE FUNCTION public.sync_subscription_to_trial()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.user_trials(device_id, plan, trial_started_at, trial_ends_at)
      VALUES (NEW.device_id, NEW.plan,
        COALESCE(NEW.current_period_start, now()),
        COALESCE(NEW.current_period_end, now() + INTERVAL '30 days'))
    ON CONFLICT (device_id) DO UPDATE
      SET plan = EXCLUDED.plan, trial_ends_at = EXCLUDED.trial_ends_at;
    PERFORM public.log_audit_event('subscription_activated','user_subscription',NEW.id::text,
      jsonb_build_object('device_id',NEW.device_id,'plan',NEW.plan,'period_end',NEW.current_period_end));
  ELSIF NEW.status IN ('expired','cancelled') AND OLD.status = 'active' THEN
    UPDATE public.user_trials SET plan = 'trial', trial_ends_at = LEAST(trial_ends_at, now())
     WHERE device_id = NEW.device_id;
    PERFORM public.log_audit_event('subscription_'||NEW.status,'user_subscription',NEW.id::text,
      jsonb_build_object('device_id',NEW.device_id,'previous_plan',OLD.plan));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_subscription_to_trial ON public.user_subscriptions;
CREATE TRIGGER trg_sync_subscription_to_trial
  AFTER INSERT OR UPDATE OF status, plan, current_period_end ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_to_trial();

-- =====================================================================
-- 7. Audit receipt status changes
-- =====================================================================
CREATE OR REPLACE FUNCTION public.audit_payment_receipt_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('payment_receipt_uploaded','payment_receipt',NEW.id::text,
      jsonb_build_object('device_id',NEW.device_id,'plan',NEW.requested_plan,'amount',NEW.amount));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_audit_event('payment_receipt_'||NEW.status,'payment_receipt',NEW.id::text,
      jsonb_build_object('device_id',NEW.device_id,'reviewer',NEW.reviewer_id,'notes',NEW.reviewer_notes));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_payment_receipt ON public.payment_receipts;
CREATE TRIGGER trg_audit_payment_receipt
  AFTER INSERT OR UPDATE ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_receipt_change();
