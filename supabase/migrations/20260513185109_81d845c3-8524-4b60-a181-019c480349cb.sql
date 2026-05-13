-- 1. Pin search_path on the three flagged functions
ALTER FUNCTION public._journey_temporal_state(timestamptz) SET search_path = public;
ALTER FUNCTION public._journey_timeline_version(uuid)      SET search_path = public;
ALTER FUNCTION public.compute_refund_tier(timestamptz, timestamptz, numeric, timestamptz) SET search_path = public;

-- 2. Revoke EXECUTE from anon and PUBLIC on every SECURITY DEFINER function in public
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, PUBLIC',
      r.schema, r.name, r.args
    );
  END LOOP;
END $$;

-- 3. Re-grant EXECUTE to authenticated on the patient-app RPC allowlist
GRANT EXECUTE ON FUNCTION public.claim_guest_patient_data(text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(text, integer)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_manual_otp(text, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_patient(text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_has_consent(uuid, text, consent_section) TO authenticated;
GRANT EXECUTE ON FUNCTION public.journey_get_timeline(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.journey_create_artifact(uuid, uuid, text, text, text, timestamptz, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.journey_mark_artifact_done(uuid, uuid, integer, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.journey_reschedule_artifact(uuid, uuid, integer, uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.journey_cancel_artifact(uuid, uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.journey_archive_journey(uuid, uuid, text)          TO authenticated;

-- 4. Re-grant EXECUTE to anon for the guest-mode patient RPCs
--    (in-function _journey_caller_owns / device_id checks enforce ownership)
GRANT EXECUTE ON FUNCTION public.claim_guest_patient_data(text)        TO anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(text, integer)      TO anon;
GRANT EXECUTE ON FUNCTION public.consume_manual_otp(text, text)        TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_patient(text)                  TO anon;
GRANT EXECUTE ON FUNCTION public.journey_get_timeline(uuid)            TO anon;
GRANT EXECUTE ON FUNCTION public.journey_create_artifact(uuid, uuid, text, text, text, timestamptz, uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.journey_mark_artifact_done(uuid, uuid, integer, timestamptz, text) TO anon;
GRANT EXECUTE ON FUNCTION public.journey_reschedule_artifact(uuid, uuid, integer, uuid, timestamptz, text) TO anon;
GRANT EXECUTE ON FUNCTION public.journey_cancel_artifact(uuid, uuid, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.journey_archive_journey(uuid, uuid, text)          TO anon;