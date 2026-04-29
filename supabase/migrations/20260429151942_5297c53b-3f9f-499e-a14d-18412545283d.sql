-- ============================================================
-- Refund/Wallet Phase 3:
--   1) Wallet integrity alerts table + reconciliation function + daily cron
--   2) Wallet audit log table for payouts & dispute resolutions
--   3) Triggers that write audit rows AND patient notifications
-- ============================================================

-- ---------- 1. Wallet integrity alerts ----------
CREATE TABLE IF NOT EXISTS public.wallet_integrity_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.patient_wallets(id) ON DELETE CASCADE,
  user_id uuid,
  device_id text,
  expected_balance numeric(12,2) NOT NULL,
  actual_balance numeric(12,2) NOT NULL,
  drift numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wia_open ON public.wallet_integrity_alerts(resolved, created_at DESC);

ALTER TABLE public.wallet_integrity_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage integrity alerts" ON public.wallet_integrity_alerts;
CREATE POLICY "Admins manage integrity alerts" ON public.wallet_integrity_alerts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Reconcile every wallet: actual balance vs sum(transactions)
CREATE OR REPLACE FUNCTION public.reconcile_wallet_balances()
RETURNS TABLE(checked int, flagged int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checked int := 0;
  v_flagged int := 0;
  r record;
  v_expected numeric(12,2);
BEGIN
  FOR r IN SELECT id, user_id, device_id, balance, currency FROM public.patient_wallets LOOP
    v_checked := v_checked + 1;
    SELECT COALESCE(SUM(
      CASE WHEN tx_type = 'credit' THEN amount ELSE -amount END
    ), 0)
      INTO v_expected
      FROM public.wallet_transactions
      WHERE wallet_id = r.id;
    IF ROUND(v_expected, 2) <> ROUND(r.balance, 2) THEN
      -- Only insert if no open alert for the same drift today
      IF NOT EXISTS (
        SELECT 1 FROM public.wallet_integrity_alerts
        WHERE wallet_id = r.id
          AND resolved = false
          AND created_at > now() - interval '24 hours'
      ) THEN
        INSERT INTO public.wallet_integrity_alerts(
          wallet_id, user_id, device_id, expected_balance, actual_balance, drift, currency
        ) VALUES (
          r.id, r.user_id, r.device_id, v_expected, r.balance, r.balance - v_expected, r.currency
        );
        v_flagged := v_flagged + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN QUERY SELECT v_checked, v_flagged;
END;
$$;

-- Daily cron — 02:30 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('reconcile-wallets-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule(
  'reconcile-wallets-daily',
  '30 2 * * *',
  $$ SELECT public.reconcile_wallet_balances(); $$
);

-- ---------- 2. Wallet audit log ----------
CREATE TABLE IF NOT EXISTS public.wallet_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,            -- payout_recorded | dispute_opened | dispute_status_changed | dispute_resolved | manual_refund | integrity_flagged
  target_type text,                -- wallet | payout | dispute | transaction
  target_id uuid,
  wallet_id uuid,
  user_id uuid,
  device_id text,
  amount numeric(12,2),
  currency text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_wal_created ON public.wallet_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wal_action ON public.wallet_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wal_wallet ON public.wallet_audit_log(wallet_id, created_at DESC);

ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read wallet audit" ON public.wallet_audit_log;
CREATE POLICY "Admins read wallet audit" ON public.wallet_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "System inserts wallet audit" ON public.wallet_audit_log;
CREATE POLICY "System inserts wallet audit" ON public.wallet_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Helper to fetch actor email
CREATE OR REPLACE FUNCTION public._actor_email_safe()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Trigger: payouts -> audit
CREATE OR REPLACE FUNCTION public.audit_wallet_payout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallet_audit_log(
    actor_id, actor_email, action, target_type, target_id,
    wallet_id, user_id, device_id, amount, currency, details
  ) VALUES (
    auth.uid(), public._actor_email_safe(), 'payout_recorded', 'payout', NEW.id,
    NEW.wallet_id, NEW.user_id, NEW.device_id, NEW.amount, NEW.currency,
    jsonb_build_object(
      'method', NEW.method,
      'reference_no', NEW.reference_no,
      'has_receipt', NEW.receipt_file_path IS NOT NULL,
      'status', NEW.status,
      'related_dispute_id', NEW.related_dispute_id,
      'notes', NEW.notes
    )
  );
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_audit_wallet_payout ON public.wallet_payouts;
CREATE TRIGGER trg_audit_wallet_payout
  AFTER INSERT ON public.wallet_payouts
  FOR EACH ROW EXECUTE FUNCTION public.audit_wallet_payout();

-- Trigger: dispute INSERT/UPDATE -> audit + notification
CREATE OR REPLACE FUNCTION public.audit_and_notify_dispute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_action text;
  v_title text;
  v_title_ar text;
  v_body text;
  v_body_ar text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'dispute_opened';
    v_title := 'Refund review opened';
    v_title_ar := 'تم فتح مراجعة لاسترداد المبلغ';
    v_body := 'Your cancellation is under admin review. Tier preview: ' || COALESCE(NEW.tier_at_open,'n/a');
    v_body_ar := 'الإلغاء قيد المراجعة من قِبل الإدارة. المستوى المتوقع: ' || COALESCE(NEW.tier_at_open,'n/a');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_action := 'dispute_status_changed';
    IF NEW.status = 'under_review' THEN
      v_title := 'Refund review in progress';
      v_title_ar := 'مراجعة الاسترداد قيد التنفيذ';
      v_body := 'An admin is reviewing your refund request.';
      v_body_ar := 'يقوم أحد المسؤولين بمراجعة طلب الاسترداد.';
    ELSIF NEW.status = 'refunded' THEN
      v_action := 'dispute_resolved';
      v_title := 'Refund credited to your wallet';
      v_title_ar := 'تم إيداع الاسترداد في محفظتك';
      v_body := 'Amount: ' || NEW.currency || ' ' || COALESCE(NEW.resolved_amount, 0)::text;
      v_body_ar := 'المبلغ: ' || NEW.currency || ' ' || COALESCE(NEW.resolved_amount, 0)::text;
    ELSIF NEW.status = 'approved' THEN
      v_title := 'Refund approved';
      v_title_ar := 'تمت الموافقة على الاسترداد';
      v_body := 'Your refund was approved and will be credited shortly.';
      v_body_ar := 'تمت الموافقة على الاسترداد وسيتم إيداعه قريباً.';
    ELSIF NEW.status = 'rejected' THEN
      v_title := 'Refund request not approved';
      v_title_ar := 'لم تتم الموافقة على طلب الاسترداد';
      v_body := COALESCE(NEW.resolution_note, 'Please contact support for details.');
      v_body_ar := COALESCE(NEW.resolution_note, 'يرجى التواصل مع الدعم لمزيد من التفاصيل.');
    ELSE
      v_title := 'Refund status updated';
      v_title_ar := 'تم تحديث حالة الاسترداد';
      v_body := 'New status: ' || NEW.status;
      v_body_ar := 'الحالة الجديدة: ' || NEW.status;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Audit
  INSERT INTO public.wallet_audit_log(
    actor_id, actor_email, action, target_type, target_id,
    user_id, device_id, amount, currency, details
  ) VALUES (
    auth.uid(), public._actor_email_safe(), v_action, 'dispute', NEW.id,
    NEW.user_id, NEW.device_id, NEW.resolved_amount, NEW.currency,
    jsonb_build_object('status', NEW.status, 'tier', NEW.tier_at_open, 'reason', NEW.reason, 'note', NEW.resolution_note)
  );

  -- Notification (only when we have a device id)
  IF NEW.device_id IS NOT NULL THEN
    INSERT INTO public.patient_notifications(
      patient_device_id, kind, title, title_ar, body, body_ar, link
    ) VALUES (
      NEW.device_id,
      CASE WHEN NEW.status = 'refunded' THEN 'success'
           WHEN NEW.status = 'rejected' THEN 'warning'
           ELSE 'info' END,
      v_title, v_title_ar, v_body, v_body_ar, '/app/wallet'
    );
  END IF;

  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_audit_dispute_ins ON public.refund_disputes;
CREATE TRIGGER trg_audit_dispute_ins
  AFTER INSERT ON public.refund_disputes
  FOR EACH ROW EXECUTE FUNCTION public.audit_and_notify_dispute();
DROP TRIGGER IF EXISTS trg_audit_dispute_upd ON public.refund_disputes;
CREATE TRIGGER trg_audit_dispute_upd
  AFTER UPDATE ON public.refund_disputes
  FOR EACH ROW EXECUTE FUNCTION public.audit_and_notify_dispute();

-- Trigger: integrity alert -> audit
CREATE OR REPLACE FUNCTION public.audit_integrity_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallet_audit_log(
    action, target_type, target_id, wallet_id, user_id, device_id,
    amount, currency, details
  ) VALUES (
    'integrity_flagged', 'wallet', NEW.wallet_id, NEW.wallet_id,
    NEW.user_id, NEW.device_id, NEW.drift, NEW.currency,
    jsonb_build_object('expected', NEW.expected_balance, 'actual', NEW.actual_balance)
  );
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_audit_integrity ON public.wallet_integrity_alerts;
CREATE TRIGGER trg_audit_integrity
  AFTER INSERT ON public.wallet_integrity_alerts
  FOR EACH ROW EXECUTE FUNCTION public.audit_integrity_alert();