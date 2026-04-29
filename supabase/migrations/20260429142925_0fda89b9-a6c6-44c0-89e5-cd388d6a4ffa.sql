
-- =====================================================================
-- PATIENT WALLET + REFUND ENGINE
-- =====================================================================
-- Refund tier rules (time-elapsed only):
--   * elapsed <= 25%  -> FULL refund (100%)
--   * 25% < elapsed <= 45% -> PARTIAL refund (50%)
--   * elapsed > 45%   -> NO refund (0%)
-- Add-ons: NON-REFUNDABLE by default. Admin may grant a manual refund
--   (fixed amount or % of unit_price) on a per-addon basis.
-- Refunds credit the patient wallet (ledger). Future: bank payout.
-- =====================================================================

-- ---------- Wallet table -----------
CREATE TABLE IF NOT EXISTS public.patient_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  device_id TEXT UNIQUE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wallet_owner_chk CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);

ALTER TABLE public.patient_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own wallet" ON public.patient_wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anon reads wallet by device" ON public.patient_wallets
  FOR SELECT TO anon, authenticated
  USING (device_id = ((current_setting('request.headers'::text, true))::json ->> 'x-device-id'::text));

CREATE POLICY "Admins manage wallets" ON public.patient_wallets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.patient_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Wallet ledger -----------
-- kind: 'refund_credit' | 'manual_credit' | 'manual_debit' | 'payout' | 'addon_refund'
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.patient_wallets(id) ON DELETE CASCADE,
  user_id UUID,
  device_id TEXT,
  kind TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'SAR',
  balance_after NUMERIC(12,2) NOT NULL,
  -- Source linking
  subscription_id UUID,
  addon_id UUID,
  refund_tier TEXT,            -- 'full' | 'partial' | 'none' | 'manual'
  refund_pct NUMERIC(5,2),     -- 0..100
  elapsed_pct NUMERIC(5,2),    -- 0..100, time-elapsed at refund time
  -- Audit
  actor_id UUID,
  reason TEXT,
  reference TEXT,              -- credit-note number
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_device ON public.wallet_transactions(device_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own wallet tx" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anon reads wallet tx by device" ON public.wallet_transactions
  FOR SELECT TO anon, authenticated
  USING (device_id = ((current_setting('request.headers'::text, true))::json ->> 'x-device-id'::text));

CREATE POLICY "Admins manage wallet tx" ON public.wallet_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------- Helpers -----------

-- Compute refund tier & amount from elapsed time only.
CREATE OR REPLACE FUNCTION public.compute_refund_tier(
  _period_start TIMESTAMPTZ,
  _period_end   TIMESTAMPTZ,
  _amount       NUMERIC,
  _now          TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(tier TEXT, refund_pct NUMERIC, refund_amount NUMERIC, elapsed_pct NUMERIC)
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  total_secs NUMERIC;
  used_secs  NUMERIC;
  pct        NUMERIC;
BEGIN
  IF _period_start IS NULL OR _period_end IS NULL OR _amount IS NULL OR _amount <= 0 THEN
    RETURN QUERY SELECT 'none'::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC; RETURN;
  END IF;
  total_secs := EXTRACT(EPOCH FROM (_period_end - _period_start));
  used_secs  := GREATEST(EXTRACT(EPOCH FROM (_now - _period_start)), 0);
  IF total_secs <= 0 THEN
    RETURN QUERY SELECT 'none'::TEXT, 0::NUMERIC, 0::NUMERIC, 100::NUMERIC; RETURN;
  END IF;
  pct := ROUND((used_secs / total_secs) * 100, 2);
  IF pct <= 25 THEN
    RETURN QUERY SELECT 'full'::TEXT, 100::NUMERIC, ROUND(_amount, 2), pct;
  ELSIF pct <= 45 THEN
    RETURN QUERY SELECT 'partial'::TEXT, 50::NUMERIC, ROUND(_amount * 0.5, 2), pct;
  ELSE
    RETURN QUERY SELECT 'none'::TEXT, 0::NUMERIC, 0::NUMERIC, pct;
  END IF;
END;
$$;

-- Get-or-create wallet by user/device
CREATE OR REPLACE FUNCTION public.get_or_create_wallet(_user_id UUID, _device_id TEXT, _currency TEXT DEFAULT 'SAR')
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id UUID;
BEGIN
  IF _user_id IS NOT NULL THEN
    SELECT id INTO _id FROM public.patient_wallets WHERE user_id = _user_id;
  END IF;
  IF _id IS NULL AND _device_id IS NOT NULL THEN
    SELECT id INTO _id FROM public.patient_wallets WHERE device_id = _device_id;
  END IF;
  IF _id IS NULL THEN
    INSERT INTO public.patient_wallets(user_id, device_id, currency)
    VALUES (_user_id, _device_id, _currency) RETURNING id INTO _id;
  ELSE
    -- backfill missing identifier
    UPDATE public.patient_wallets
       SET user_id = COALESCE(user_id, _user_id),
           device_id = COALESCE(device_id, _device_id)
     WHERE id = _id;
  END IF;
  RETURN _id;
END;
$$;

-- Credit the wallet (atomic). Returns the transaction id.
CREATE OR REPLACE FUNCTION public.credit_wallet(
  _user_id UUID, _device_id TEXT, _amount NUMERIC, _currency TEXT,
  _kind TEXT, _reason TEXT, _subscription_id UUID, _addon_id UUID,
  _refund_tier TEXT, _refund_pct NUMERIC, _elapsed_pct NUMERIC,
  _actor_id UUID, _details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _wid UUID;
  _new_bal NUMERIC;
  _tx_id UUID;
  _ref TEXT;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be positive';
  END IF;
  _wid := public.get_or_create_wallet(_user_id, _device_id, COALESCE(_currency,'SAR'));

  UPDATE public.patient_wallets
     SET balance = balance + _amount,
         currency = COALESCE(_currency, currency),
         updated_at = now()
   WHERE id = _wid
   RETURNING balance INTO _new_bal;

  _ref := 'CN-' || to_char(now() AT TIME ZONE 'UTC','YYYYMMDD') || '-' ||
          UPPER(SUBSTRING(MD5(random()::text || _wid::text) FOR 6));

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, device_id, kind, direction, amount, currency, balance_after,
    subscription_id, addon_id, refund_tier, refund_pct, elapsed_pct,
    actor_id, reason, reference, details
  ) VALUES (
    _wid, _user_id, _device_id, _kind, 'credit', _amount, COALESCE(_currency,'SAR'), _new_bal,
    _subscription_id, _addon_id, _refund_tier, _refund_pct, _elapsed_pct,
    _actor_id, _reason, _ref, COALESCE(_details,'{}'::jsonb)
  ) RETURNING id INTO _tx_id;

  -- Notify patient (credit note)
  IF _device_id IS NOT NULL THEN
    INSERT INTO public.patient_notifications(
      patient_device_id, kind, title, title_ar, body, body_ar, link
    ) VALUES (
      _device_id, 'credit_note',
      'Credit note · ' || _ref,
      'إشعار دائن · ' || _ref,
      'Refunded ' || _amount::text || ' ' || COALESCE(_currency,'SAR') || ' to your wallet',
      'تم استرداد ' || _amount::text || ' ' || COALESCE(_currency,'SAR') || ' إلى محفظتك',
      '/app/dashboard/subscription'
    );
  END IF;

  PERFORM public.log_audit_event('wallet_credited','wallet_transaction',_tx_id::text,
    jsonb_build_object('amount',_amount,'kind',_kind,'tier',_refund_tier,'reference',_ref));

  RETURN _tx_id;
END;
$$;

-- Auto-refund on subscription cancellation (user-cancel).
-- Triggered when subscriptions.status moves to 'canceled'.
CREATE OR REPLACE FUNCTION public.auto_refund_on_cancel()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  _is_user_initiated BOOLEAN;
BEGIN
  IF NEW.status <> 'canceled' OR OLD.status = 'canceled' THEN
    RETURN NEW;
  END IF;

  -- Skip if a flag in notes says admin-dispute (manual review)
  _is_user_initiated := COALESCE(NEW.notes, '') NOT ILIKE '%admin_review%';

  IF NOT _is_user_initiated THEN
    RETURN NEW;
  END IF;

  -- Compute refund tier
  SELECT * INTO r FROM public.compute_refund_tier(
    NEW.current_period_start, NEW.current_period_end, NEW.amount, now()
  );

  IF r.refund_amount > 0 THEN
    PERFORM public.credit_wallet(
      NEW.user_id, NEW.device_id, r.refund_amount, NEW.currency,
      'refund_credit',
      'Auto-refund on cancellation (' || r.tier || ', ' || r.elapsed_pct || '% elapsed)',
      NEW.id, NULL, r.tier, r.refund_pct, r.elapsed_pct,
      NULL,
      jsonb_build_object('plan', NEW.plan, 'cycle', NEW.billing_cycle, 'paid_amount', NEW.amount)
    );
  ELSE
    -- Still log the no-refund decision for transparency
    IF NEW.device_id IS NOT NULL THEN
      INSERT INTO public.patient_notifications(
        patient_device_id, kind, title, title_ar, body, body_ar, link
      ) VALUES (
        NEW.device_id, 'subscription',
        'Subscription canceled · no refund',
        'تم إلغاء الاشتراك · لا يوجد استرداد',
        'No refund applies (' || r.elapsed_pct || '% of period elapsed). Contact support to dispute.',
        'لا يوجد استرداد (' || r.elapsed_pct || '٪ من المدة). تواصل مع الدعم للاعتراض.',
        '/app/dashboard/subscription'
      );
    END IF;
    PERFORM public.log_audit_event('subscription_cancel_no_refund','subscription',NEW.id::text,
      jsonb_build_object('elapsed_pct', r.elapsed_pct));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_refund_on_cancel
  AFTER UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.auto_refund_on_cancel();

-- Admin manual refund (for either subscription or addon)
CREATE OR REPLACE FUNCTION public.admin_issue_refund(
  _subscription_id UUID, _addon_id UUID, _amount NUMERIC, _reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user UUID; _device TEXT; _currency TEXT; _tx UUID;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can issue refunds';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF _subscription_id IS NOT NULL THEN
    SELECT user_id, device_id, currency INTO _user, _device, _currency
      FROM public.subscriptions WHERE id = _subscription_id;
  ELSIF _addon_id IS NOT NULL THEN
    SELECT s.user_id, s.device_id, a.currency INTO _user, _device, _currency
      FROM public.subscription_addons a JOIN public.subscriptions s ON s.id = a.subscription_id
      WHERE a.id = _addon_id;
  ELSE
    RAISE EXCEPTION 'Either subscription_id or addon_id is required';
  END IF;

  _tx := public.credit_wallet(
    _user, _device, _amount, COALESCE(_currency,'SAR'),
    CASE WHEN _addon_id IS NOT NULL THEN 'addon_refund' ELSE 'manual_refund' END,
    COALESCE(_reason,'Admin manual refund'),
    _subscription_id, _addon_id, 'manual', NULL, NULL,
    auth.uid(), jsonb_build_object('manual', true)
  );
  RETURN _tx;
END;
$$;
