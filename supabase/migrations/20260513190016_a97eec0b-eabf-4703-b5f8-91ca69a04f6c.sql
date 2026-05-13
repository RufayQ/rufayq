
-- 1) Revoke execute on trigger + internal helper SECURITY DEFINER functions
DO $$
DECLARE
  _fn TEXT;
  _internal TEXT[] := ARRAY[
    -- trigger functions
    'apply_consent_request_decision()',
    'assign_org_code()',
    'audit_and_notify_dispute()',
    'audit_authorization_change()',
    'audit_integrity_alert()',
    'audit_patient_claim_change()',
    'audit_payment_receipt_change()',
    'audit_rcm_master_change()',
    'audit_visit_change()',
    'audit_wallet_payout()',
    'auto_refund_on_cancel()',
    'auto_refund_on_user_sub_cancel()',
    'bump_pricing_catalog_version()',
    'cms_log_version()',
    'handle_new_user_status()',
    'log_receipt_event()',
    'log_subscription_event()',
    'notify_patient_from_provider()',
    'notify_patient_of_admission_status()',
    'notify_patient_of_authorization()',
    'notify_patient_of_claim()',
    'notify_patient_of_consent_request()',
    'open_dispute_on_admin_review()',
    'rcm_assign_claim_no()',
    'rcm_claim_notify()',
    'rcm_compute_claim_line()',
    'rcm_notify_patient_invoice()',
    'rcm_recompute_claim_balance()',
    'rcm_recompute_claim_totals()',
    'sync_subscription_to_trial()',
    'trg_rcm_recompute_from_payment()',
    'trg_rcm_recompute_from_service()',
    -- internal helpers (called from other functions only)
    '_actor_email_safe()',
    'log_audit_event(text, text, text, jsonb)',
    'credit_wallet(uuid, text, numeric, text, text, text, uuid, uuid, text, integer, integer, uuid, jsonb)',
    'get_or_create_wallet(uuid, text, text)',
    'rcm_recompute_invoice(uuid)',
    'reconcile_wallet_balances()'
  ];
BEGIN
  FOREACH _fn IN ARRAY _internal LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', _fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing function: %', _fn;
    END;
  END LOOP;
END $$;

-- 2) Lock down mutation_idempotency_log: deny all client access; SECURITY DEFINER RPCs bypass RLS.
DROP POLICY IF EXISTS "deny_all_clients" ON public.mutation_idempotency_log;
CREATE POLICY "deny_all_clients"
  ON public.mutation_idempotency_log
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
