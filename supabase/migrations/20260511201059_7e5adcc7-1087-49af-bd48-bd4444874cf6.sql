
-- ========================================================================
-- admin_adjust_wallet — secure, audited admin RPC for manual wallet
-- credits/debits (bonuses, corrections, payouts, duplicate-credit reversals).
-- Reuses patient_wallets, wallet_transactions, wallet_audit_log.
-- ========================================================================
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  _user_id UUID,
  _device_id TEXT,
  _direction TEXT,
  _amount NUMERIC,
  _currency TEXT,
  _kind TEXT,
  _reason TEXT,
  _reference_no TEXT DEFAULT NULL,
  _details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _wid UUID;
  _bal NUMERIC;
  _new_bal NUMERIC;
  _tx UUID;
  _ref TEXT;
  _cur TEXT;
  _is_credit BOOLEAN;
  _details_full JSONB;
  _allowed_kinds TEXT[] := ARRAY[
    'manual_credit','manual_debit','bonus_credit',
    'correction_credit','correction_debit','duplicate_reversal','bank_payout'
  ];
  _credit_kinds TEXT[] := ARRAY['manual_credit','bonus_credit','correction_credit'];
  _debit_kinds  TEXT[] := ARRAY['manual_debit','correction_debit','duplicate_reversal','bank_payout'];
BEGIN
  -- 1. Admin gate
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only admins can adjust wallets';
  END IF;

  -- 2. Validation
  IF _direction NOT IN ('credit','debit') THEN
    RAISE EXCEPTION 'Invalid direction: %', _direction;
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  IF _amount > 1000000 THEN
    RAISE EXCEPTION 'Amount exceeds maximum (1,000,000)';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Reason is required (min 3 chars)';
  END IF;
  IF length(_reason) > 500 THEN
    RAISE EXCEPTION 'Reason too long (max 500 chars)';
  END IF;
  IF NOT (_kind = ANY(_allowed_kinds)) THEN
    RAISE EXCEPTION 'Invalid kind: %', _kind;
  END IF;
  _is_credit := (_direction = 'credit');
  IF _is_credit AND NOT (_kind = ANY(_credit_kinds)) THEN
    RAISE EXCEPTION 'Kind % is not valid for credit direction', _kind;
  END IF;
  IF NOT _is_credit AND NOT (_kind = ANY(_debit_kinds)) THEN
    RAISE EXCEPTION 'Kind % is not valid for debit direction', _kind;
  END IF;
  IF _user_id IS NULL AND (_device_id IS NULL OR length(_device_id) < 4) THEN
    RAISE EXCEPTION 'Either user_id or device_id is required';
  END IF;

  _cur := COALESCE(NULLIF(_currency,''), 'SAR');

  -- 3. Resolve + lock wallet
  _wid := public.get_or_create_wallet(_user_id, _device_id, _cur);
  SELECT balance INTO _bal FROM public.patient_wallets WHERE id = _wid FOR UPDATE;
  IF _bal IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  -- 4. Debit guard
  IF NOT _is_credit AND _bal < _amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance: % < %', _bal, _amount;
  END IF;

  -- 5. Apply balance change
  UPDATE public.patient_wallets
     SET balance = balance + (CASE WHEN _is_credit THEN _amount ELSE -_amount END),
         currency = _cur,
         updated_at = now()
   WHERE id = _wid
   RETURNING balance INTO _new_bal;

  -- 6. Reference number
  _ref := CASE WHEN _kind = 'bank_payout' THEN 'PO-' ELSE 'ADJ-' END
       || to_char(now() AT TIME ZONE 'UTC','YYYYMMDD') || '-'
       || UPPER(SUBSTRING(MD5(random()::text || _wid::text || clock_timestamp()::text) FOR 6));

  _details_full := COALESCE(_details, '{}'::jsonb)
    || jsonb_build_object(
         'reference_no', _reference_no,
         'admin_action', true,
         'admin_kind', _kind
       );

  -- 7. Insert wallet transaction
  INSERT INTO public.wallet_transactions(
    wallet_id, user_id, device_id, kind, direction, amount, currency, balance_after,
    reason, reference, actor_id, details
  ) VALUES (
    _wid, _user_id, _device_id, _kind, _direction, _amount, _cur, _new_bal,
    trim(_reason), _ref, auth.uid(), _details_full
  ) RETURNING id INTO _tx;

  -- 8. Wallet audit log
  INSERT INTO public.wallet_audit_log(
    actor_id, action, target_type, target_id,
    wallet_id, user_id, device_id, amount, currency, details
  ) VALUES (
    auth.uid(),
    'admin_adjust_' || _direction,
    'wallet_transaction', _tx,
    _wid, _user_id, _device_id, _amount, _cur,
    jsonb_build_object(
      'kind', _kind,
      'reason', trim(_reason),
      'reference', _ref,
      'reference_no', _reference_no,
      'balance_before', _bal,
      'balance_after', _new_bal
    )
  );

  -- 9. Generic admin audit event
  PERFORM public.log_audit_event(
    'wallet_admin_adjust',
    'wallet_transaction',
    _tx::text,
    jsonb_build_object(
      'direction', _direction,
      'kind', _kind,
      'amount', _amount,
      'currency', _cur,
      'reference', _ref,
      'wallet_id', _wid,
      'user_id', _user_id,
      'device_id', _device_id
    )
  );

  -- 10. Patient notification (bilingual)
  IF _device_id IS NOT NULL THEN
    INSERT INTO public.patient_notifications(
      patient_device_id, kind, title, title_ar, body, body_ar, link
    ) VALUES (
      _device_id,
      'credit_note',
      CASE WHEN _is_credit THEN 'Wallet credited · ' || _ref
           ELSE 'Wallet debited · ' || _ref END,
      CASE WHEN _is_credit THEN 'تم إضافة رصيد للمحفظة · ' || _ref
           ELSE 'تم خصم من المحفظة · ' || _ref END,
      _amount::text || ' ' || _cur || ' — ' || trim(_reason),
      _amount::text || ' ' || _cur || ' — ' || trim(_reason),
      '/app/wallet'
    );
  END IF;

  RETURN _tx;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_wallet(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
