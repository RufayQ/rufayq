-- Harden family member access: do not expose full sensitive row by member_device_id.
DROP POLICY IF EXISTS "Member reads own record by device" ON public.family_members;

-- Explicitly restrict direct OTP-code writes to admins only.
DROP POLICY IF EXISTS "Only admins can insert manual otp codes" ON public.manual_otp_codes;
CREATE POLICY "Only admins can insert manual otp codes"
  ON public.manual_otp_codes
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can update manual otp codes" ON public.manual_otp_codes;
CREATE POLICY "Only admins can update manual otp codes"
  ON public.manual_otp_codes
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can delete manual otp codes" ON public.manual_otp_codes;
CREATE POLICY "Only admins can delete manual otp codes"
  ON public.manual_otp_codes
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Reduce verification-assistance PII visibility to admins only.
DROP POLICY IF EXISTS "Staff view assistance requests" ON public.verification_assistance_requests;
CREATE POLICY "Admins view assistance requests"
  ON public.verification_assistance_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update assistance requests" ON public.verification_assistance_requests;
CREATE POLICY "Admins update assistance requests"
  ON public.verification_assistance_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Make idempotency payload logs explicitly inaccessible to direct clients.
DROP POLICY IF EXISTS "deny_all_clients" ON public.mutation_idempotency_log;
DROP POLICY IF EXISTS "Restrict direct client access to idempotency log" ON public.mutation_idempotency_log;
CREATE POLICY "Restrict direct client access to idempotency log"
  ON public.mutation_idempotency_log
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- OTP verification attempts are written only by the trusted verify-otp function.
DROP POLICY IF EXISTS "Block direct client otp attempt writes" ON public.otp_verify_attempts;
CREATE POLICY "Block direct client otp attempt writes"
  ON public.otp_verify_attempts
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- Patient data audit logs are append-only from trusted server/database functions, not clients.
DROP POLICY IF EXISTS "pdaudit_ins_owner" ON public.patient_data_audit_log;
DROP POLICY IF EXISTS "Block direct client patient audit inserts" ON public.patient_data_audit_log;
CREATE POLICY "Block direct client patient audit inserts"
  ON public.patient_data_audit_log
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);
