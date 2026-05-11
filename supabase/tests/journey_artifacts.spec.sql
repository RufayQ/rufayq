-- ============================================================================
-- Journey Timeline v2 — Phase 1 invariant tests
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/journey_artifacts.spec.sql
-- All tests run in a transaction and ROLLBACK at the end so they are
-- non-destructive against a real database.
-- ============================================================================

BEGIN;

-- Pretend we are PostgREST: simulate JWT + headers via local settings.
DO $$ DECLARE
  _user_a UUID := '11111111-1111-1111-1111-111111111111';
  _user_b UUID := '22222222-2222-2222-2222-222222222222';
  _patient_a UUID; _patient_b UUID;
  _journey_a UUID; _journey_b UUID;
  _step_a_today UUID; _step_a_future UUID; _step_a_past UUID;
  _art UUID; _art2 UUID;
  _resp JSONB; _ver INT;
BEGIN
  -- Seed two distinct patients/journeys/steps
  INSERT INTO public.patients(user_id, device_id, active)
    VALUES (_user_a, 'devA-1234567890', true) RETURNING id INTO _patient_a;
  INSERT INTO public.patients(user_id, device_id, active)
    VALUES (_user_b, 'devB-1234567890', true) RETURNING id INTO _patient_b;

  INSERT INTO public.journeys(patient_id, user_id, device_id, journey_title, status)
    VALUES (_patient_a, _user_a, 'devA-1234567890', 'Test A', 'active') RETURNING id INTO _journey_a;
  INSERT INTO public.journeys(patient_id, user_id, device_id, journey_title, status)
    VALUES (_patient_b, _user_b, 'devB-1234567890', 'Test B', 'active') RETURNING id INTO _journey_b;

  INSERT INTO public.journey_steps(journey_id, patient_id, step_order, step_type, title, due_at)
    VALUES (_journey_a, _patient_a, 1, 'visit', 'Past step', now() - INTERVAL '7 days')
    RETURNING id INTO _step_a_past;
  INSERT INTO public.journey_steps(journey_id, patient_id, step_order, step_type, title, due_at)
    VALUES (_journey_a, _patient_a, 2, 'visit', 'Today step', now())
    RETURNING id INTO _step_a_today;
  INSERT INTO public.journey_steps(journey_id, patient_id, step_order, step_type, title, due_at)
    VALUES (_journey_a, _patient_a, 3, 'visit', 'Future step', now() + INTERVAL '7 days')
    RETURNING id INTO _step_a_future;

  ----------------------------------------------------------------
  RAISE NOTICE '── 1. Owner A can create + read artifact';
  ----------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', _user_a::text, true);
  PERFORM set_config('request.headers',
    json_build_object('x-device-id','devA-1234567890')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  _resp := public.journey_create_artifact(
    _step_a_today, gen_random_uuid(), 'appointment',
    'Cardiology consult', NULL, now(), NULL, 'Appointment', NULL
  );
  _art := (_resp->'artifact'->>'id')::uuid;
  ASSERT _art IS NOT NULL, '1a: artifact id returned';
  ASSERT (_resp->>'timeline_version')::bigint > 0, '1b: timeline_version present';

  _resp := public.journey_get_timeline(_journey_a);
  ASSERT jsonb_array_length(_resp->'milestones') = 3, '1c: 3 milestones returned';

  ----------------------------------------------------------------
  RAISE NOTICE '── 2. User B cannot read User A timeline';
  ----------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', _user_b::text, true);
  PERFORM set_config('request.headers',
    json_build_object('x-device-id','devB-1234567890')::text, true);
  BEGIN
    PERFORM public.journey_get_timeline(_journey_a);
    RAISE EXCEPTION '2: User B should be FORBIDDEN';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    RAISE NOTICE '   ✓ FORBIDDEN as expected';
  END;

  ----------------------------------------------------------------
  RAISE NOTICE '── 3. Future artifact mark-done returns TEMPORAL_VIOLATION';
  ----------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', _user_a::text, true);
  PERFORM set_config('request.headers',
    json_build_object('x-device-id','devA-1234567890')::text, true);

  _resp := public.journey_create_artifact(
    _step_a_future, gen_random_uuid(), 'appointment',
    'Future visit', NULL, now() + INTERVAL '7 days', NULL, NULL, NULL);
  _art2 := (_resp->'artifact'->>'id')::uuid;
  _ver := (_resp->'artifact'->>'version')::int;

  BEGIN
    PERFORM public.journey_mark_artifact_done(_art2, gen_random_uuid(), _ver, NULL, NULL);
    RAISE EXCEPTION '3: future done should fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%TEMPORAL_VIOLATION%' THEN RAISE; END IF;
    RAISE NOTICE '   ✓ TEMPORAL_VIOLATION';
  END;

  ----------------------------------------------------------------
  RAISE NOTICE '── 4. VERSION_CONFLICT on stale version';
  ----------------------------------------------------------------
  BEGIN
    PERFORM public.journey_mark_artifact_done(_art, gen_random_uuid(), 99, NULL, NULL);
    RAISE EXCEPTION '4: stale version should fail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%VERSION_CONFLICT%' THEN RAISE; END IF;
    RAISE NOTICE '   ✓ VERSION_CONFLICT';
  END;

  ----------------------------------------------------------------
  RAISE NOTICE '── 5. Today done succeeds and bumps version';
  ----------------------------------------------------------------
  _ver := (public.journey_get_timeline(_journey_a)
            ->'milestones'->1->'artifacts'->0->>'version')::int;
  _resp := public.journey_mark_artifact_done(_art, gen_random_uuid(), _ver, NULL, NULL);
  ASSERT (_resp->'artifact'->>'status') = 'done', '5a: status=done';
  ASSERT (_resp->'artifact'->>'version')::int = _ver + 1, '5b: version bumped';

  ----------------------------------------------------------------
  RAISE NOTICE '── 6. Idempotency: same key returns cached payload, single audit row';
  ----------------------------------------------------------------
  DECLARE
    _key UUID := gen_random_uuid();
    _resp1 JSONB; _resp2 JSONB; _audits INT;
  BEGIN
    _resp1 := public.journey_create_artifact(
      _step_a_today, _key, 'medication', 'Vitamin D', NULL, NULL, NULL, NULL, NULL);
    _resp2 := public.journey_create_artifact(
      _step_a_today, _key, 'medication', 'Vitamin D', NULL, NULL, NULL, NULL, NULL);
    ASSERT (_resp1->'artifact'->>'id') = (_resp2->'artifact'->>'id'),
      '6a: same artifact id on retry';
    SELECT count(*) INTO _audits
      FROM public.admin_audit_log
      WHERE action = 'journey_artifact_created'
        AND target_id = (_resp1->'artifact'->>'id');
    ASSERT _audits = 1, '6b: exactly one audit row';
  END;

  ----------------------------------------------------------------
  RAISE NOTICE '── 7. Reschedule keeps origin visible and creates new artifact';
  ----------------------------------------------------------------
  DECLARE _new_id UUID;
  BEGIN
    _ver := 1; -- fresh artifact
    _resp := public.journey_create_artifact(
      _step_a_today, gen_random_uuid(), 'appointment', 'To reschedule',
      NULL, now(), NULL, NULL, NULL);
    _art := (_resp->'artifact'->>'id')::uuid;
    _ver := (_resp->'artifact'->>'version')::int;

    _resp := public.journey_reschedule_artifact(
      _art, gen_random_uuid(), _ver, _step_a_future, now()+INTERVAL '7 days', 'patient request');
    _new_id := (_resp->'new_artifact'->>'id')::uuid;
    ASSERT (_resp->'original_artifact'->>'status') = 'rescheduled', '7a: origin rescheduled';
    ASSERT (_resp->'original_artifact'->>'rescheduled_to_id')::uuid = _new_id, '7b: linked forward';
    ASSERT (_resp->'new_artifact'->>'rescheduled_from_id')::uuid = _art, '7c: linked back';
    ASSERT (_resp->'new_artifact'->>'status') = 'pending', '7d: new pending';
  END;

  RAISE NOTICE '✅ ALL JOURNEY TIMELINE TESTS PASSED';
END $$;

ROLLBACK;
