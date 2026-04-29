-- ── 1. Wallet payouts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.patient_wallets(id) ON DELETE CASCADE,
  user_id UUID,
  device_id TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'SAR',
  method TEXT NOT NULL DEFAULT 'bank' CHECK (method IN ('bank','manual','cash')),
  reference_no TEXT,
  receipt_file_path TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  reviewer_id UUID,
  notes TEXT,
  related_dispute_id UUID,
  related_tx_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_payouts_wallet ON public.wallet_payouts(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_payouts_user   ON public.wallet_payouts(user_id, created_at DESC);

ALTER TABLE public.wallet_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_payouts_select_own_or_admin" ON public.wallet_payouts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "wallet_payouts_admin_write" ON public.wallet_payouts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_wallet_payouts_updated_at
  BEFORE UPDATE ON public.wallet_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2. Refund disputes & timeline ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.refund_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID,
  user_subscription_id UUID,
  addon_id UUID,
  user_id UUID,
  device_id TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','under_review','approved','rejected','refunded')),
  tier_at_open TEXT,
  elapsed_pct_at_open NUMERIC(5,2),
  preview_amount NUMERIC(12,2),
  resolved_amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'SAR',
  reason TEXT,
  resolution_note TEXT,
  refund_tx_id UUID,
  reviewer_id UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refund_disputes_user  ON public.refund_disputes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refund_disputes_dev   ON public.refund_disputes(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refund_disputes_state ON public.refund_disputes(status);

ALTER TABLE public.refund_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_select_own_or_admin" ON public.refund_disputes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "disputes_admin_write" ON public.refund_disputes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_disputes_updated_at
  BEFORE UPDATE ON public.refund_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.refund_dispute_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.refund_disputes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_id UUID,
  actor_role TEXT,
  note TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dispute_events_dispute ON public.refund_dispute_events(dispute_id, created_at);

ALTER TABLE public.refund_dispute_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_events_select_own_or_admin" ON public.refund_dispute_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.refund_disputes d
       WHERE d.id = dispute_id
         AND (d.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
    )
  );

CREATE POLICY "dispute_events_admin_write" ON public.refund_dispute_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ── 3. Auto-open a dispute when a sub is cancelled with [admin_review] flag
CREATE OR REPLACE FUNCTION public.open_dispute_on_admin_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; _id UUID;
BEGIN
  IF NEW.status NOT IN ('cancelled','canceled') OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.notes,'') NOT ILIKE '%admin_review%' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO r FROM public.compute_refund_tier(
    NEW.current_period_start, NEW.current_period_end, NEW.amount, now()
  );
  INSERT INTO public.refund_disputes(
    user_subscription_id, subscription_id, user_id, device_id, status,
    tier_at_open, elapsed_pct_at_open, preview_amount, currency, reason
  ) VALUES (
    CASE WHEN TG_TABLE_NAME = 'user_subscriptions' THEN NEW.id END,
    CASE WHEN TG_TABLE_NAME = 'subscriptions'      THEN NEW.id END,
    CASE WHEN TG_TABLE_NAME = 'subscriptions'      THEN NEW.user_id END,
    NEW.device_id, 'open',
    r.tier, r.elapsed_pct, r.refund_amount, NEW.currency,
    'Admin-review flag set on cancellation'
  ) RETURNING id INTO _id;

  INSERT INTO public.refund_dispute_events(dispute_id, event_type, to_status, actor_id, note, details)
  VALUES (_id, 'opened', 'open', auth.uid(),
    'Cancellation flagged for admin review',
    jsonb_build_object('elapsed_pct', r.elapsed_pct, 'tier', r.tier, 'preview_amount', r.refund_amount));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dispute_open_user_sub ON public.user_subscriptions;
CREATE TRIGGER trg_dispute_open_user_sub
  AFTER UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.open_dispute_on_admin_review();

DROP TRIGGER IF EXISTS trg_dispute_open_sub ON public.subscriptions;
CREATE TRIGGER trg_dispute_open_sub
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.open_dispute_on_admin_review();

-- ── 4. RPC: admin_record_payout ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_record_payout(
  _user_id UUID,
  _device_id TEXT,
  _amount NUMERIC,
  _currency TEXT,
  _method TEXT,
  _reference_no TEXT,
  _receipt_file_path TEXT,
  _notes TEXT,
  _dispute_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _wid UUID; _bal NUMERIC; _payout UUID; _tx UUID; _ref TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can record payouts';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  IF COALESCE(_reference_no,'') = '' AND COALESCE(_receipt_file_path,'') = '' THEN
    RAISE EXCEPTION 'Provide a reference number or upload a receipt';
  END IF;

  _wid := public.get_or_create_wallet(_user_id, _device_id, COALESCE(_currency,'SAR'));
  SELECT balance INTO _bal FROM public.patient_wallets WHERE id = _wid FOR UPDATE;
  IF _bal < _amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance: % < %', _bal, _amount;
  END IF;

  UPDATE public.patient_wallets
     SET balance = balance - _amount, updated_at = now()
   WHERE id = _wid
   RETURNING balance INTO _bal;

  _ref := 'PO-' || to_char(now() AT TIME ZONE 'UTC','YYYYMMDD') || '-' ||
          UPPER(SUBSTRING(MD5(random()::text || _wid::text) FOR 6));

  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, device_id, kind, direction, amount, currency, balance_after,
    reason, reference, actor_id, details
  ) VALUES (
    _wid, _user_id, _device_id, 'bank_payout', 'debit', _amount, COALESCE(_currency,'SAR'), _bal,
    COALESCE(_notes,'Admin recorded bank/manual payout'),
    _ref, auth.uid(),
    jsonb_build_object('method',_method,'reference_no',_reference_no,'receipt_path',_receipt_file_path)
  ) RETURNING id INTO _tx;

  INSERT INTO public.wallet_payouts(
    wallet_id, user_id, device_id, amount, currency, method,
    reference_no, receipt_file_path, status, reviewer_id, notes,
    related_dispute_id, related_tx_id
  ) VALUES (
    _wid, _user_id, _device_id, _amount, COALESCE(_currency,'SAR'), COALESCE(_method,'bank'),
    NULLIF(_reference_no,''), NULLIF(_receipt_file_path,''), 'completed', auth.uid(), _notes,
    _dispute_id, _tx
  ) RETURNING id INTO _payout;

  PERFORM public.log_audit_event('wallet_payout_recorded','wallet_payout', _payout::text,
    jsonb_build_object('amount',_amount,'method',_method,'reference',_ref));

  IF _device_id IS NOT NULL THEN
    INSERT INTO public.patient_notifications(
      patient_device_id, kind, title, title_ar, body, body_ar, link
    ) VALUES (
      _device_id, 'credit_note',
      'Payout sent · ' || _ref,
      'تم تحويل المبلغ · ' || _ref,
      _amount::text || ' ' || COALESCE(_currency,'SAR') || ' transferred from your wallet',
      _amount::text || ' ' || COALESCE(_currency,'SAR') || ' تم تحويلها من محفظتك',
      '/app/dashboard/subscription'
    );
  END IF;

  RETURN _payout;
END $$;

-- ── 5. RPC: admin_resolve_dispute ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  _dispute_id UUID,
  _to_status TEXT,
  _override_amount NUMERIC,
  _note TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.refund_disputes%ROWTYPE; _tx UUID;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can resolve disputes';
  END IF;
  IF _to_status NOT IN ('under_review','approved','rejected','refunded') THEN
    RAISE EXCEPTION 'Invalid dispute status: %', _to_status;
  END IF;
  SELECT * INTO d FROM public.refund_disputes WHERE id = _dispute_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;

  IF _to_status IN ('approved','refunded') AND COALESCE(_override_amount, d.preview_amount, 0) > 0 THEN
    _tx := public.credit_wallet(
      d.user_id, d.device_id,
      COALESCE(_override_amount, d.preview_amount),
      d.currency, 'dispute_refund',
      COALESCE(_note,'Dispute resolved with refund'),
      d.subscription_id, d.addon_id, 'dispute', NULL, d.elapsed_pct_at_open,
      auth.uid(), jsonb_build_object('dispute_id', d.id)
    );
  END IF;

  UPDATE public.refund_disputes
     SET status = _to_status,
         reviewer_id = auth.uid(),
         resolution_note = COALESCE(_note, resolution_note),
         resolved_amount = COALESCE(_override_amount, d.preview_amount, resolved_amount),
         refund_tx_id = COALESCE(_tx, refund_tx_id),
         resolved_at = CASE WHEN _to_status IN ('approved','rejected','refunded') THEN now() ELSE resolved_at END,
         updated_at = now()
   WHERE id = _dispute_id;

  INSERT INTO public.refund_dispute_events(dispute_id, event_type, from_status, to_status, actor_id, note, details)
  VALUES (_dispute_id, 'status_changed', d.status, _to_status, auth.uid(), _note,
          jsonb_build_object('amount', COALESCE(_override_amount, d.preview_amount), 'tx', _tx));

  PERFORM public.log_audit_event('refund_dispute_'||_to_status,'refund_dispute',_dispute_id::text,
    jsonb_build_object('amount', COALESCE(_override_amount, d.preview_amount), 'note', _note));
END $$;