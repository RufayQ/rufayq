
CREATE OR REPLACE FUNCTION public.auto_refund_on_user_sub_cancel()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  _is_user_initiated BOOLEAN;
BEGIN
  IF NEW.status <> 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  _is_user_initiated := COALESCE(NEW.notes, '') NOT ILIKE '%admin_review%'
                    AND COALESCE(NEW.notes, '') NOT ILIKE '%no_refund%';
  IF NOT _is_user_initiated THEN
    RETURN NEW;
  END IF;

  SELECT * INTO r FROM public.compute_refund_tier(
    NEW.current_period_start, NEW.current_period_end, NEW.amount, now()
  );

  IF r.refund_amount > 0 THEN
    PERFORM public.credit_wallet(
      NULL, NEW.device_id, r.refund_amount, NEW.currency,
      'refund_credit',
      'Auto-refund on cancellation (' || r.tier || ', ' || r.elapsed_pct || '% elapsed)',
      NEW.id, NULL, r.tier, r.refund_pct, r.elapsed_pct,
      NEW.activated_by,
      jsonb_build_object('plan', NEW.plan, 'cycle', NEW.billing_cycle, 'paid_amount', NEW.amount)
    );
  ELSE
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
    PERFORM public.log_audit_event('user_subscription_cancel_no_refund','user_subscription',NEW.id::text,
      jsonb_build_object('elapsed_pct', r.elapsed_pct));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_refund_on_user_sub_cancel ON public.user_subscriptions;
CREATE TRIGGER trg_auto_refund_on_user_sub_cancel
  AFTER UPDATE OF status ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.auto_refund_on_user_sub_cancel();
