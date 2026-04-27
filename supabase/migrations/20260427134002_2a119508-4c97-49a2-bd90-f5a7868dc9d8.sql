-- Gap G-1: code expiry on payment_receipts
ALTER TABLE public.payment_receipts
  ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ
    DEFAULT (now() + interval '24 hours');

-- Backfill existing pending rows so the expiry job doesn't immediately kill them
UPDATE public.payment_receipts
   SET code_expires_at = created_at + interval '24 hours'
 WHERE code_expires_at IS NULL;

-- Allow 'code_expired' status
ALTER TABLE public.payment_receipts
  DROP CONSTRAINT IF EXISTS payment_receipts_status_check;
ALTER TABLE public.payment_receipts
  ADD CONSTRAINT payment_receipts_status_check
  CHECK (status IN (
    'pending','under_review','needs_more_info','verified','rejected','code_expired'
  ));

-- Gap G-5: reverse FK from subscription to the receipt that paid for it
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS payment_receipt_id UUID
    REFERENCES public.payment_receipts(id) ON DELETE SET NULL;

-- Gap G-4: moderator UPDATE policy (admins already covered elsewhere)
DROP POLICY IF EXISTS "moderators_can_update_receipts" ON public.payment_receipts;
CREATE POLICY "moderators_can_update_receipts"
  ON public.payment_receipts
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Index for the expiry sweep job
CREATE INDEX IF NOT EXISTS idx_payment_receipts_expiry
  ON public.payment_receipts (code_expires_at)
  WHERE status = 'pending';
