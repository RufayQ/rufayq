
-- ============================================================================
-- Journey Timeline v2 — Phase 1: Schema + RLS + production RPCs
-- ============================================================================

-- ── 1. Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.journey_artifact_type AS ENUM (
    'medical_record','appointment','transport_ticket','medication',
    'care_plan','insurance_claim','nphies_task','custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.journey_artifact_status AS ENUM (
    'pending','in_progress','done','cancelled','rescheduled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.journey_artifact_source AS ENUM (
    'patient_app','clinician','nphies','system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. journey_artifacts table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journey_artifacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_step_id       UUID NOT NULL REFERENCES public.journey_steps(id) ON DELETE CASCADE,
  journey_id            UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  patient_id            UUID NOT NULL,
  user_id               UUID,
  device_id             TEXT,
  artifact_type         public.journey_artifact_type NOT NULL,
  linked_entity_id      UUID,
  fhir_resource_type    TEXT,
  fhir_resource_id      TEXT,
  title                 TEXT NOT NULL,
  title_ar              TEXT,
  status                public.journey_artifact_status NOT NULL DEFAULT 'pending',
  due_at                TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,
  rescheduled_from_id   UUID REFERENCES public.journey_artifacts(id) ON DELETE SET NULL,
  rescheduled_to_id     UUID REFERENCES public.journey_artifacts(id) ON DELETE SET NULL,
  source                public.journey_artifact_source NOT NULL DEFAULT 'patient_app',
  audit_locked          BOOLEAN NOT NULL DEFAULT FALSE,
  version               INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  CONSTRAINT ja_owner_present CHECK (user_id IS NOT NULL OR device_id IS NOT NULL),
  CONSTRAINT ja_title_len CHECK (char_length(title) BETWEEN 1 AND 200)
);

CREATE INDEX IF NOT EXISTS idx_ja_step      ON public.journey_artifacts(journey_step_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ja_journey   ON public.journey_artifacts(journey_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ja_patient   ON public.journey_artifacts(patient_id, due_at);
CREATE INDEX IF NOT EXISTS idx_ja_user      ON public.journey_artifacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ja_device    ON public.journey_artifacts(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ja_resched   ON public.journey_artifacts(rescheduled_from_id) WHERE rescheduled_from_id IS NOT NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_ja_updated_at ON public.journey_artifacts;
CREATE TRIGGER trg_ja_updated_at
  BEFORE UPDATE ON public.journey_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 3. RLS for journey_artifacts ───────────────────────────────────────────
-- Mirrors existing repo pattern: owner is signed-in user OR the device id
-- carried in the x-device-id header. WITH CHECK mirrors USING.
ALTER TABLE public.journey_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ja_sel ON public.journey_artifacts;
CREATE POLICY ja_sel ON public.journey_artifacts
  FOR SELECT TO authenticated, anon
  USING (
    user_id = auth.uid()
    OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS ja_ins ON public.journey_artifacts;
CREATE POLICY ja_ins ON public.journey_artifacts
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    user_id = auth.uid()
    OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
  );

DROP POLICY IF EXISTS ja_upd ON public.journey_artifacts;
CREATE POLICY ja_upd ON public.journey_artifacts
  FOR UPDATE TO authenticated, anon
  USING (
    user_id = auth.uid()
    OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id')
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS ja_del ON public.journey_artifacts;
CREATE POLICY ja_del ON public.journey_artifacts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── 4. mutation_idempotency_log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mutation_idempotency_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   UUID NOT NULL,
  actor_user_id     UUID,
  actor_device_id   TEXT,
  rpc_name          TEXT NOT NULL,
  request_hash      TEXT,
  response_payload  JSONB NOT NULL,
  status_code       INTEGER NOT NULL DEFAULT 200,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mil_key
  ON public.mutation_idempotency_log(
    idempotency_key,
    COALESCE(actor_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(actor_device_id, ''),
    rpc_name
  );
CREATE INDEX IF NOT EXISTS idx_mil_expires ON public.mutation_idempotency_log(expires_at);

ALTER TABLE public.mutation_idempotency_log ENABLE ROW LEVEL SECURITY;
-- No client policies; only SECURITY DEFINER functions touch this table.

-- ── 5. Helper: ownership check for a journey ───────────────────────────────
CREATE OR REPLACE FUNCTION public._journey_caller_owns(_journey_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _hdr_device TEXT;
  _exists BOOLEAN;
BEGIN
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  SELECT EXISTS (
    SELECT 1 FROM public.journeys j
    WHERE j.id = _journey_id
      AND j.deleted_at IS NULL
      AND (
        (auth.uid() IS NOT NULL AND j.user_id = auth.uid())
        OR (_hdr_device IS NOT NULL AND j.device_id = _hdr_device)
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  ) INTO _exists;
  RETURN COALESCE(_exists, FALSE);
END $$;

-- ── 6. Helper: idempotency lookup/insert ───────────────────────────────────
CREATE OR REPLACE FUNCTION public._journey_idem_lookup(_key UUID, _rpc TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _hdr_device TEXT;
  _payload JSONB;
BEGIN
  IF _key IS NULL THEN RETURN NULL; END IF;
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  SELECT response_payload INTO _payload
  FROM public.mutation_idempotency_log
  WHERE idempotency_key = _key
    AND rpc_name = _rpc
    AND COALESCE(actor_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND COALESCE(actor_device_id, '') = COALESCE(_hdr_device, '')
    AND expires_at > now()
  LIMIT 1;
  RETURN _payload;
END $$;

CREATE OR REPLACE FUNCTION public._journey_idem_save(_key UUID, _rpc TEXT, _payload JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _hdr_device TEXT;
BEGIN
  IF _key IS NULL THEN RETURN; END IF;
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  INSERT INTO public.mutation_idempotency_log(
    idempotency_key, actor_user_id, actor_device_id, rpc_name, response_payload
  ) VALUES (_key, auth.uid(), _hdr_device, _rpc, _payload)
  ON CONFLICT DO NOTHING;
END $$;

-- ── 7. Helper: temporal state in Asia/Riyadh ───────────────────────────────
CREATE OR REPLACE FUNCTION public._journey_temporal_state(_due TIMESTAMPTZ)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _due IS NULL THEN 'future'
    WHEN (_due AT TIME ZONE 'Asia/Riyadh')::date < (now() AT TIME ZONE 'Asia/Riyadh')::date THEN 'past'
    WHEN (_due AT TIME ZONE 'Asia/Riyadh')::date = (now() AT TIME ZONE 'Asia/Riyadh')::date THEN 'today'
    ELSE 'future'
  END;
$$;

-- ── 8. Helper: timeline_version (max(updated_at) epoch ms) ─────────────────
CREATE OR REPLACE FUNCTION public._journey_timeline_version(_journey_id UUID)
RETURNS BIGINT
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    GREATEST(
      (SELECT EXTRACT(EPOCH FROM MAX(updated_at))*1000 FROM public.journey_steps WHERE journey_id = _journey_id),
      (SELECT EXTRACT(EPOCH FROM MAX(updated_at))*1000 FROM public.journey_artifacts WHERE journey_id = _journey_id)
    ),
    0
  )::bigint;
$$;

-- ── 9. RPC: journey_get_timeline ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.journey_get_timeline(_journey_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _milestones JSONB;
BEGIN
  IF NOT public._journey_caller_owns(_journey_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: journey not accessible' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(m ORDER BY (m->>'step_order')::int), '[]'::jsonb) INTO _milestones
  FROM (
    SELECT jsonb_build_object(
      'id', s.id,
      'journey_id', s.journey_id,
      'patient_id', s.patient_id,
      'title', s.title,
      'title_ar', NULL,
      'phase', NULL,
      'due_at', s.due_at,
      'temporal_state', public._journey_temporal_state(s.due_at),
      'step_order', s.step_order,
      'deleted_at', s.deleted_at,
      'artifacts', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', a.id,
          'journey_step_id', a.journey_step_id,
          'patient_id', a.patient_id,
          'artifact_type', a.artifact_type,
          'linked_entity_id', a.linked_entity_id,
          'fhir_resource_type', a.fhir_resource_type,
          'fhir_resource_id', a.fhir_resource_id,
          'title', a.title,
          'title_ar', a.title_ar,
          'status', a.status,
          'due_at', a.due_at,
          'temporal_state', public._journey_temporal_state(COALESCE(a.due_at, s.due_at)),
          'completed_at', a.completed_at,
          'cancelled_at', a.cancelled_at,
          'cancel_reason', a.cancel_reason,
          'rescheduled_from_id', a.rescheduled_from_id,
          'rescheduled_to_id', a.rescheduled_to_id,
          'source', a.source,
          'audit_locked', a.audit_locked,
          'version', a.version,
          'created_at', a.created_at,
          'updated_at', a.updated_at
        ) ORDER BY a.created_at)
        FROM public.journey_artifacts a
        WHERE a.journey_step_id = s.id AND a.deleted_at IS NULL
      ), '[]'::jsonb)
    ) AS m
    FROM public.journey_steps s
    WHERE s.journey_id = _journey_id AND s.deleted_at IS NULL
  ) sub;

  RETURN jsonb_build_object(
    'milestones', _milestones,
    'timeline_version', public._journey_timeline_version(_journey_id),
    'updated_at_max', (SELECT MAX(updated_at) FROM public.journey_artifacts WHERE journey_id = _journey_id),
    'server_time', now()
  );
END $$;

-- ── 10. RPC: journey_create_artifact ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.journey_create_artifact(
  _step_id UUID,
  _idempotency_key UUID,
  _artifact_type TEXT,
  _title TEXT,
  _title_ar TEXT DEFAULT NULL,
  _due_at TIMESTAMPTZ DEFAULT NULL,
  _linked_entity_id UUID DEFAULT NULL,
  _fhir_resource_type TEXT DEFAULT NULL,
  _fhir_resource_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _step public.journey_steps%ROWTYPE;
  _journey public.journeys%ROWTYPE;
  _hdr_device TEXT;
  _new_id UUID;
  _row public.journey_artifacts%ROWTYPE;
  _cached JSONB; _resp JSONB;
BEGIN
  _cached := public._journey_idem_lookup(_idempotency_key, 'journey_create_artifact');
  IF _cached IS NOT NULL THEN RETURN _cached; END IF;

  IF _idempotency_key IS NULL THEN RAISE EXCEPTION 'VALIDATION: idempotency_key required'; END IF;
  IF _step_id IS NULL THEN RAISE EXCEPTION 'VALIDATION: step_id required'; END IF;
  IF _title IS NULL OR length(trim(_title)) = 0 THEN RAISE EXCEPTION 'VALIDATION: title required'; END IF;

  SELECT * INTO _step FROM public.journey_steps WHERE id = _step_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: step'; END IF;
  SELECT * INTO _journey FROM public.journeys WHERE id = _step.journey_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: journey'; END IF;

  IF NOT public._journey_caller_owns(_journey.id) THEN
    RAISE EXCEPTION 'FORBIDDEN: journey not accessible' USING ERRCODE = '42501';
  END IF;

  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');

  INSERT INTO public.journey_artifacts(
    journey_step_id, journey_id, patient_id, user_id, device_id,
    artifact_type, linked_entity_id, fhir_resource_type, fhir_resource_id,
    title, title_ar, status, due_at, source
  ) VALUES (
    _step.id, _journey.id, _journey.patient_id,
    _journey.user_id, COALESCE(_journey.device_id, _hdr_device),
    _artifact_type::public.journey_artifact_type,
    _linked_entity_id, _fhir_resource_type, _fhir_resource_id,
    trim(_title), _title_ar, 'pending'::public.journey_artifact_status,
    _due_at, 'patient_app'::public.journey_artifact_source
  ) RETURNING id INTO _new_id;

  SELECT * INTO _row FROM public.journey_artifacts WHERE id = _new_id;

  PERFORM public.log_audit_event('journey_artifact_created','journey_artifact', _new_id::text,
    jsonb_build_object('step_id',_step.id,'type',_artifact_type,'title',_title,
                       'idempotency_key',_idempotency_key));

  _resp := jsonb_build_object(
    'artifact', to_jsonb(_row),
    'timeline_version', public._journey_timeline_version(_journey.id)
  );
  PERFORM public._journey_idem_save(_idempotency_key, 'journey_create_artifact', _resp);
  RETURN _resp;
END $$;

-- ── 11. RPC: journey_mark_artifact_done ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.journey_mark_artifact_done(
  _artifact_id UUID,
  _idempotency_key UUID,
  _expected_version INTEGER,
  _completed_at TIMESTAMPTZ DEFAULT NULL,
  _reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.journey_artifacts%ROWTYPE;
  _step public.journey_steps%ROWTYPE;
  _temporal TEXT;
  _is_admin BOOLEAN;
  _before JSONB; _resp JSONB; _cached JSONB;
BEGIN
  _cached := public._journey_idem_lookup(_idempotency_key, 'journey_mark_artifact_done');
  IF _cached IS NOT NULL THEN RETURN _cached; END IF;
  IF _idempotency_key IS NULL THEN RAISE EXCEPTION 'VALIDATION: idempotency_key required'; END IF;

  SELECT * INTO _row FROM public.journey_artifacts WHERE id = _artifact_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: artifact'; END IF;
  IF NOT public._journey_caller_owns(_row.journey_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: artifact not accessible' USING ERRCODE = '42501';
  END IF;
  IF _row.version <> _expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT: expected % got %', _expected_version, _row.version;
  END IF;
  IF _row.status NOT IN ('pending','in_progress') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: % -> done', _row.status;
  END IF;

  SELECT * INTO _step FROM public.journey_steps WHERE id = _row.journey_step_id;
  _temporal := public._journey_temporal_state(COALESCE(_row.due_at, _step.due_at));
  _is_admin := public.has_role(auth.uid(),'admin'::app_role);

  IF _temporal = 'future' THEN
    RAISE EXCEPTION 'TEMPORAL_VIOLATION: cannot mark future artifact done';
  END IF;
  IF _temporal = 'past' AND NOT _is_admin THEN
    RAISE EXCEPTION 'TEMPORAL_VIOLATION: only clinician/admin may mark past artifact done';
  END IF;
  IF _temporal = 'past' AND (_reason IS NULL OR length(trim(_reason)) < 3) THEN
    RAISE EXCEPTION 'VALIDATION: reason required when marking past artifact done';
  END IF;

  _before := to_jsonb(_row);
  UPDATE public.journey_artifacts
     SET status = 'done',
         completed_at = COALESCE(_completed_at, now()),
         version = version + 1,
         updated_at = now()
   WHERE id = _artifact_id
   RETURNING * INTO _row;

  PERFORM public.log_audit_event('journey_artifact_done','journey_artifact', _artifact_id::text,
    jsonb_build_object('before',_before->'status','after','done','reason',_reason,
                       'idempotency_key',_idempotency_key));

  _resp := jsonb_build_object(
    'artifact', to_jsonb(_row),
    'timeline_version', public._journey_timeline_version(_row.journey_id)
  );
  PERFORM public._journey_idem_save(_idempotency_key, 'journey_mark_artifact_done', _resp);
  RETURN _resp;
END $$;

-- ── 12. RPC: journey_cancel_artifact ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.journey_cancel_artifact(
  _artifact_id UUID,
  _idempotency_key UUID,
  _expected_version INTEGER,
  _reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.journey_artifacts%ROWTYPE; _before JSONB; _resp JSONB; _cached JSONB;
BEGIN
  _cached := public._journey_idem_lookup(_idempotency_key, 'journey_cancel_artifact');
  IF _cached IS NOT NULL THEN RETURN _cached; END IF;
  IF _idempotency_key IS NULL THEN RAISE EXCEPTION 'VALIDATION: idempotency_key required'; END IF;

  SELECT * INTO _row FROM public.journey_artifacts WHERE id = _artifact_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: artifact'; END IF;
  IF NOT public._journey_caller_owns(_row.journey_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: artifact not accessible' USING ERRCODE = '42501';
  END IF;
  IF _row.version <> _expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT: expected % got %', _expected_version, _row.version;
  END IF;
  IF _row.status NOT IN ('pending','in_progress') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: % -> cancelled', _row.status;
  END IF;
  IF _row.status = 'in_progress' AND (_reason IS NULL OR length(trim(_reason)) < 3) THEN
    RAISE EXCEPTION 'VALIDATION: reason required when cancelling in-progress artifact';
  END IF;

  _before := to_jsonb(_row);
  UPDATE public.journey_artifacts
     SET status = 'cancelled', cancelled_at = now(),
         cancel_reason = NULLIF(trim(COALESCE(_reason,'')), ''),
         version = version + 1, updated_at = now()
   WHERE id = _artifact_id
   RETURNING * INTO _row;

  PERFORM public.log_audit_event('journey_artifact_cancelled','journey_artifact', _artifact_id::text,
    jsonb_build_object('before',_before->'status','reason',_reason,'idempotency_key',_idempotency_key));

  _resp := jsonb_build_object('artifact', to_jsonb(_row),
                              'timeline_version', public._journey_timeline_version(_row.journey_id));
  PERFORM public._journey_idem_save(_idempotency_key, 'journey_cancel_artifact', _resp);
  RETURN _resp;
END $$;

-- ── 13. RPC: journey_reschedule_artifact (atomic) ──────────────────────────
CREATE OR REPLACE FUNCTION public.journey_reschedule_artifact(
  _artifact_id UUID,
  _idempotency_key UUID,
  _expected_version INTEGER,
  _target_step_id UUID,
  _new_due_at TIMESTAMPTZ,
  _reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _orig public.journey_artifacts%ROWTYPE;
  _new_id UUID; _new_row public.journey_artifacts%ROWTYPE;
  _target_step public.journey_steps%ROWTYPE;
  _resp JSONB; _cached JSONB;
BEGIN
  _cached := public._journey_idem_lookup(_idempotency_key, 'journey_reschedule_artifact');
  IF _cached IS NOT NULL THEN RETURN _cached; END IF;
  IF _idempotency_key IS NULL THEN RAISE EXCEPTION 'VALIDATION: idempotency_key required'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'VALIDATION: reason required for reschedule';
  END IF;

  SELECT * INTO _orig FROM public.journey_artifacts WHERE id = _artifact_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: artifact'; END IF;
  IF NOT public._journey_caller_owns(_orig.journey_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: artifact not accessible' USING ERRCODE = '42501';
  END IF;
  IF _orig.version <> _expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT: expected % got %', _expected_version, _orig.version;
  END IF;
  IF _orig.status NOT IN ('pending','in_progress') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: % -> rescheduled', _orig.status;
  END IF;

  -- Resolve target step (default = same step)
  SELECT * INTO _target_step FROM public.journey_steps
   WHERE id = COALESCE(_target_step_id, _orig.journey_step_id) AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: target_step'; END IF;
  IF _target_step.journey_id <> _orig.journey_id THEN
    RAISE EXCEPTION 'VALIDATION: target_step must belong to same journey';
  END IF;

  -- Create the new artifact on target step
  INSERT INTO public.journey_artifacts(
    journey_step_id, journey_id, patient_id, user_id, device_id,
    artifact_type, linked_entity_id, fhir_resource_type, fhir_resource_id,
    title, title_ar, status, due_at, source, rescheduled_from_id
  ) VALUES (
    _target_step.id, _orig.journey_id, _orig.patient_id,
    _orig.user_id, _orig.device_id,
    _orig.artifact_type, _orig.linked_entity_id,
    _orig.fhir_resource_type, _orig.fhir_resource_id,
    _orig.title, _orig.title_ar, 'pending'::public.journey_artifact_status,
    COALESCE(_new_due_at, _target_step.due_at),
    _orig.source, _orig.id
  ) RETURNING id INTO _new_id;

  -- Lock original into rescheduled state
  UPDATE public.journey_artifacts
     SET status = 'rescheduled', rescheduled_to_id = _new_id,
         audit_locked = TRUE, cancel_reason = NULLIF(trim(_reason), ''),
         version = version + 1, updated_at = now()
   WHERE id = _orig.id;

  SELECT * INTO _orig FROM public.journey_artifacts WHERE id = _orig.id;
  SELECT * INTO _new_row FROM public.journey_artifacts WHERE id = _new_id;

  PERFORM public.log_audit_event('journey_artifact_rescheduled','journey_artifact', _orig.id::text,
    jsonb_build_object('to', _new_id, 'target_step', _target_step.id, 'reason', _reason,
                       'idempotency_key', _idempotency_key));

  _resp := jsonb_build_object(
    'original_artifact', to_jsonb(_orig),
    'new_artifact', to_jsonb(_new_row),
    'timeline_version', public._journey_timeline_version(_orig.journey_id)
  );
  PERFORM public._journey_idem_save(_idempotency_key, 'journey_reschedule_artifact', _resp);
  RETURN _resp;
END $$;

-- ── 14. RPC: journey_archive_journey ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.journey_archive_journey(
  _journey_id UUID,
  _idempotency_key UUID,
  _reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _resp JSONB; _cached JSONB; _archived TIMESTAMPTZ;
BEGIN
  _cached := public._journey_idem_lookup(_idempotency_key, 'journey_archive_journey');
  IF _cached IS NOT NULL THEN RETURN _cached; END IF;
  IF _idempotency_key IS NULL THEN RAISE EXCEPTION 'VALIDATION: idempotency_key required'; END IF;
  IF NOT public._journey_caller_owns(_journey_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: journey not accessible' USING ERRCODE = '42501';
  END IF;

  _archived := now();
  UPDATE public.journeys
     SET status = 'archived', deleted_at = _archived, updated_at = _archived,
         version = version + 1
   WHERE id = _journey_id AND deleted_at IS NULL;

  PERFORM public.log_audit_event('journey_archived','journey', _journey_id::text,
    jsonb_build_object('reason', _reason, 'idempotency_key', _idempotency_key));

  _resp := jsonb_build_object(
    'archived_at', _archived,
    'timeline_version', public._journey_timeline_version(_journey_id)
  );
  PERFORM public._journey_idem_save(_idempotency_key, 'journey_archive_journey', _resp);
  RETURN _resp;
END $$;

-- ── 15. Permissions ────────────────────────────────────────────────────────
-- Guest/device flows are first-class, so anon must be able to call these.
-- Internal helpers enforce ownership via journeys.user_id / journeys.device_id.
REVOKE ALL ON FUNCTION public.journey_get_timeline(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.journey_create_artifact(UUID,UUID,TEXT,TEXT,TEXT,TIMESTAMPTZ,UUID,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.journey_mark_artifact_done(UUID,UUID,INTEGER,TIMESTAMPTZ,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.journey_cancel_artifact(UUID,UUID,INTEGER,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.journey_reschedule_artifact(UUID,UUID,INTEGER,UUID,TIMESTAMPTZ,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.journey_archive_journey(UUID,UUID,TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.journey_get_timeline(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.journey_create_artifact(UUID,UUID,TEXT,TEXT,TEXT,TIMESTAMPTZ,UUID,TEXT,TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.journey_mark_artifact_done(UUID,UUID,INTEGER,TIMESTAMPTZ,TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.journey_cancel_artifact(UUID,UUID,INTEGER,TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.journey_reschedule_artifact(UUID,UUID,INTEGER,UUID,TIMESTAMPTZ,TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.journey_archive_journey(UUID,UUID,TEXT) TO authenticated, anon;

-- Internal helpers: do NOT expose
REVOKE ALL ON FUNCTION public._journey_caller_owns(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._journey_idem_lookup(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._journey_idem_save(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._journey_temporal_state(TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._journey_timeline_version(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._journey_temporal_state(TIMESTAMPTZ) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public._journey_timeline_version(UUID) TO authenticated, anon;
