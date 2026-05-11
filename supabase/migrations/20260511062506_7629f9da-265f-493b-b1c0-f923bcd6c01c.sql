
-- =========================================================================
-- BUG-005 PHASE 1: Patient Data Persistence Architecture
-- =========================================================================

-- Helper: standard owner check trigger isn't needed; we use CHECK constraints.
-- Helper: shared updated_at trigger function already exists as
--   public.update_updated_at_column()

-- =========================================================================
-- 1. PATIENTS (central anchor)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NULL,
  device_id     text NULL,
  display_name  text NULL,
  date_of_birth date NULL,
  gender        text NULL,
  nationality   text NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz NULL,
  CONSTRAINT patients_owner_check CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_patients_user      ON public.patients(user_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_device    ON public.patients(device_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_user_active   ON public.patients(user_id)   WHERE active AND deleted_at IS NULL AND user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_device_active ON public.patients(device_id) WHERE active AND deleted_at IS NULL AND user_id IS NULL AND device_id IS NOT NULL;

CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_owner_select" ON public.patients FOR SELECT
USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "patients_owner_insert" ON public.patients FOR INSERT
WITH CHECK (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "patients_owner_update" ON public.patients FOR UPDATE
USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "patients_owner_delete" ON public.patients FOR DELETE
USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- =========================================================================
-- 2. ALTER existing transport tables to join the architecture
-- =========================================================================
ALTER TABLE public.transport_tickets
  ADD COLUMN IF NOT EXISTS patient_id          uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sync_status         text NOT NULL DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS version             int  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source              text NOT NULL DEFAULT 'scanner',
  ADD COLUMN IF NOT EXISTS deleted_at          timestamptz NULL,
  ADD COLUMN IF NOT EXISTS client_generated_id text NULL;

ALTER TABLE public.transport_tickets ALTER COLUMN device_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transport_tickets_patient ON public.transport_tickets(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transport_tickets_deleted ON public.transport_tickets(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transport_tickets_cgid
  ON public.transport_tickets(COALESCE(user_id::text, device_id), client_generated_id)
  WHERE client_generated_id IS NOT NULL;

ALTER TABLE public.transport_flight_segments
  ADD COLUMN IF NOT EXISTS patient_id  uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_transport_segments_patient ON public.transport_flight_segments(patient_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_transport_segments_updated_at') THEN
    CREATE TRIGGER trg_transport_segments_updated_at BEFORE UPDATE ON public.transport_flight_segments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =========================================================================
-- 3. Generic helper to create RLS policies for a patient-owned table
-- =========================================================================
-- (Done inline per-table for clarity.)

-- ---------- MEDICATIONS ----------
CREATE TABLE IF NOT EXISTS public.medications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id             uuid NULL,
  device_id           text NULL,
  client_generated_id text NULL,
  medication_name     text NOT NULL,
  dose                text NULL,
  route               text NULL,
  frequency           text NULL,
  start_date          date NULL,
  end_date            date NULL,
  instructions        text NULL,
  prescribing_doctor  text NULL,
  reminder_enabled    boolean NOT NULL DEFAULT false,
  reminder_times      jsonb   NOT NULL DEFAULT '[]'::jsonb,
  source              text NOT NULL DEFAULT 'manual',
  sync_status         text NOT NULL DEFAULT 'synced',
  version             int  NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,
  CONSTRAINT medications_owner_check CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON public.medications(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_medications_user    ON public.medications(user_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_medications_device  ON public.medications(device_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_medications_deleted ON public.medications(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_medications_cgid
  ON public.medications(COALESCE(user_id::text, device_id), client_generated_id)
  WHERE client_generated_id IS NOT NULL;
CREATE TRIGGER trg_medications_updated_at BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "med_sel" ON public.medications FOR SELECT USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "med_ins" ON public.medications FOR INSERT WITH CHECK (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "med_upd" ON public.medications FOR UPDATE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "med_del" ON public.medications FOR DELETE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ---------- MEDICATION_EVENTS ----------
CREATE TABLE IF NOT EXISTS public.medication_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  patient_id    uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scheduled_at  timestamptz NOT NULL,
  status        text NOT NULL CHECK (status IN ('taken','missed','skipped','snoozed')),
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  notes         text NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_med_events_med     ON public.medication_events(medication_id);
CREATE INDEX IF NOT EXISTS idx_med_events_patient ON public.medication_events(patient_id);
ALTER TABLE public.medication_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mev_all" ON public.medication_events FOR ALL
USING (EXISTS (SELECT 1 FROM public.medications m WHERE m.id = medication_events.medication_id
   AND (m.user_id = auth.uid() OR m.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.medications m WHERE m.id = medication_events.medication_id
   AND (m.user_id = auth.uid() OR m.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))));

-- ---------- MEDICAL_RECORDS ----------
CREATE TABLE IF NOT EXISTS public.medical_records (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id             uuid NULL,
  device_id           text NULL,
  client_generated_id text NULL,
  record_type         text NOT NULL CHECK (record_type IN ('lab','radiology','prescription','discharge_summary','medical_report','insurance','passport','other')),
  title               text NOT NULL,
  record_date         date NULL,
  facility_name       text NULL,
  doctor_name         text NULL,
  specialty           text NULL,
  extracted_summary   text NULL,
  structured_data     jsonb NOT NULL DEFAULT '{}'::jsonb,
  source              text NOT NULL DEFAULT 'manual',
  sync_status         text NOT NULL DEFAULT 'synced',
  version             int  NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,
  CONSTRAINT medical_records_owner_check CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_mrec_patient ON public.medical_records(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mrec_user    ON public.medical_records(user_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mrec_device  ON public.medical_records(device_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mrec_type    ON public.medical_records(record_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mrec_deleted ON public.medical_records(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mrec_cgid
  ON public.medical_records(COALESCE(user_id::text, device_id), client_generated_id)
  WHERE client_generated_id IS NOT NULL;
CREATE TRIGGER trg_mrec_updated_at BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mrec_sel" ON public.medical_records FOR SELECT USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "mrec_ins" ON public.medical_records FOR INSERT WITH CHECK (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "mrec_upd" ON public.medical_records FOR UPDATE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "mrec_del" ON public.medical_records FOR DELETE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ---------- MEDICAL_RECORD_FILES ----------
CREATE TABLE IF NOT EXISTS public.medical_record_files (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  patient_id        uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  storage_bucket    text NOT NULL DEFAULT 'patient-records',
  storage_path      text NOT NULL,
  file_name         text NOT NULL,
  mime_type         text NULL,
  file_size         bigint NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mrec_files_record  ON public.medical_record_files(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_mrec_files_patient ON public.medical_record_files(patient_id);
ALTER TABLE public.medical_record_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mrecf_all" ON public.medical_record_files FOR ALL
USING (EXISTS (SELECT 1 FROM public.medical_records r WHERE r.id = medical_record_files.medical_record_id
   AND (r.user_id = auth.uid() OR r.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.medical_records r WHERE r.id = medical_record_files.medical_record_id
   AND (r.user_id = auth.uid() OR r.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))));

-- ---------- APPOINTMENTS ----------
CREATE TABLE IF NOT EXISTS public.appointments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id             uuid NULL,
  device_id           text NULL,
  client_generated_id text NULL,
  title               text NOT NULL,
  appointment_type    text NULL,
  facility_name       text NULL,
  doctor_name         text NULL,
  specialty           text NULL,
  location            text NULL,
  start_at            timestamptz NOT NULL,
  end_at              timestamptz NULL,
  notes               text NULL,
  source              text NOT NULL DEFAULT 'manual',
  sync_status         text NOT NULL DEFAULT 'synced',
  version             int  NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,
  CONSTRAINT appointments_owner_check CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON public.appointments(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appt_user    ON public.appointments(user_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appt_device  ON public.appointments(device_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appt_deleted ON public.appointments(deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_appt_cgid
  ON public.appointments(COALESCE(user_id::text, device_id), client_generated_id)
  WHERE client_generated_id IS NOT NULL;
CREATE TRIGGER trg_appt_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appt_sel" ON public.appointments FOR SELECT USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "appt_ins" ON public.appointments FOR INSERT WITH CHECK (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "appt_upd" ON public.appointments FOR UPDATE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "appt_del" ON public.appointments FOR DELETE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ---------- ALLERGIES ----------
CREATE TABLE IF NOT EXISTS public.allergies (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id             uuid NULL,
  device_id           text NULL,
  client_generated_id text NULL,
  allergen            text NOT NULL,
  allergy_type        text NULL,
  severity            text NULL,
  reaction            text NULL,
  notes               text NULL,
  source              text NOT NULL DEFAULT 'manual',
  sync_status         text NOT NULL DEFAULT 'synced',
  version             int  NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,
  CONSTRAINT allergies_owner_check CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_allergy_patient ON public.allergies(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_allergy_user    ON public.allergies(user_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_allergy_device  ON public.allergies(device_id)  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_allergy_cgid
  ON public.allergies(COALESCE(user_id::text, device_id), client_generated_id)
  WHERE client_generated_id IS NOT NULL;
CREATE TRIGGER trg_allergy_updated_at BEFORE UPDATE ON public.allergies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alg_sel" ON public.allergies FOR SELECT USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "alg_ins" ON public.allergies FOR INSERT WITH CHECK (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "alg_upd" ON public.allergies FOR UPDATE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "alg_del" ON public.allergies FOR DELETE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ---------- JOURNEYS ----------
CREATE TABLE IF NOT EXISTS public.journeys (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id               uuid NULL,
  device_id             text NULL,
  client_generated_id   text NULL,
  journey_title         text NOT NULL,
  journey_type          text NOT NULL DEFAULT 'treatment_travel',
  destination_country   text NULL,
  destination_city      text NULL,
  current_phase         text NULL,
  start_date            date NULL,
  expected_return_date  date NULL,
  actual_return_date    date NULL,
  status                text NOT NULL DEFAULT 'active',
  source                text NOT NULL DEFAULT 'manual',
  sync_status           text NOT NULL DEFAULT 'synced',
  version               int  NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz NULL,
  CONSTRAINT journeys_owner_check CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_journey_patient ON public.journeys(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journey_user    ON public.journeys(user_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journey_device  ON public.journeys(device_id)  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_journey_cgid
  ON public.journeys(COALESCE(user_id::text, device_id), client_generated_id)
  WHERE client_generated_id IS NOT NULL;
CREATE TRIGGER trg_journey_updated_at BEFORE UPDATE ON public.journeys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jr_sel" ON public.journeys FOR SELECT USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "jr_ins" ON public.journeys FOR INSERT WITH CHECK (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "jr_upd" ON public.journeys FOR UPDATE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "jr_del" ON public.journeys FOR DELETE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ---------- JOURNEY_STEPS ----------
CREATE TABLE IF NOT EXISTS public.journey_steps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id          uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  patient_id          uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  step_order          int NOT NULL,
  step_type           text NOT NULL,
  title               text NOT NULL,
  description         text NULL,
  status              text NOT NULL DEFAULT 'pending',
  due_at              timestamptz NULL,
  completed_at        timestamptz NULL,
  linked_entity_type  text NULL,
  linked_entity_id    uuid NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL
);
CREATE INDEX IF NOT EXISTS idx_jstep_journey ON public.journey_steps(journey_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jstep_patient ON public.journey_steps(patient_id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_jstep_updated_at BEFORE UPDATE ON public.journey_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jstep_all" ON public.journey_steps FOR ALL
USING (EXISTS (SELECT 1 FROM public.journeys j WHERE j.id = journey_steps.journey_id
   AND (j.user_id = auth.uid() OR j.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.journeys j WHERE j.id = journey_steps.journey_id
   AND (j.user_id = auth.uid() OR j.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))));

-- ---------- CARE_PLANS ----------
CREATE TABLE IF NOT EXISTS public.care_plans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id             uuid NULL,
  device_id           text NULL,
  client_generated_id text NULL,
  title               text NOT NULL,
  plan_type           text NULL,
  start_date          date NULL,
  end_date            date NULL,
  status              text NOT NULL DEFAULT 'active',
  notes               text NULL,
  source              text NOT NULL DEFAULT 'manual',
  sync_status         text NOT NULL DEFAULT 'synced',
  version             int  NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,
  CONSTRAINT care_plans_owner_check CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_cp_patient ON public.care_plans(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cp_user    ON public.care_plans(user_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cp_device  ON public.care_plans(device_id)  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cp_cgid
  ON public.care_plans(COALESCE(user_id::text, device_id), client_generated_id)
  WHERE client_generated_id IS NOT NULL;
CREATE TRIGGER trg_cp_updated_at BEFORE UPDATE ON public.care_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_sel" ON public.care_plans FOR SELECT USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "cp_ins" ON public.care_plans FOR INSERT WITH CHECK (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "cp_upd" ON public.care_plans FOR UPDATE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "cp_del" ON public.care_plans FOR DELETE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ---------- CARE_PLAN_TASKS ----------
CREATE TABLE IF NOT EXISTS public.care_plan_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id  uuid NOT NULL REFERENCES public.care_plans(id) ON DELETE CASCADE,
  patient_id    uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title         text NOT NULL,
  task_type     text NULL,
  frequency     text NULL,
  due_at        timestamptz NULL,
  completed_at  timestamptz NULL,
  status        text NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz NULL
);
CREATE INDEX IF NOT EXISTS idx_cpt_plan    ON public.care_plan_tasks(care_plan_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cpt_patient ON public.care_plan_tasks(patient_id)   WHERE deleted_at IS NULL;
CREATE TRIGGER trg_cpt_updated_at BEFORE UPDATE ON public.care_plan_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.care_plan_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpt_all" ON public.care_plan_tasks FOR ALL
USING (EXISTS (SELECT 1 FROM public.care_plans p WHERE p.id = care_plan_tasks.care_plan_id
   AND (p.user_id = auth.uid() OR p.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.care_plans p WHERE p.id = care_plan_tasks.care_plan_id
   AND (p.user_id = auth.uid() OR p.device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'))));

-- ---------- EDUCATION_PROGRESS ----------
CREATE TABLE IF NOT EXISTS public.education_progress (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id             uuid NULL,
  device_id           text NULL,
  client_generated_id text NULL,
  content_id          text NOT NULL,
  content_type        text NOT NULL,
  title               text NULL,
  status              text NOT NULL DEFAULT 'started',
  progress_percent    int NOT NULL DEFAULT 0,
  completed_at        timestamptz NULL,
  source              text NOT NULL DEFAULT 'app',
  sync_status         text NOT NULL DEFAULT 'synced',
  version             int  NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL,
  CONSTRAINT education_progress_owner_check CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_edu_patient ON public.education_progress(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_edu_user    ON public.education_progress(user_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_edu_device  ON public.education_progress(device_id)  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_edu_content
  ON public.education_progress(COALESCE(user_id::text, device_id), content_id)
  WHERE deleted_at IS NULL;
CREATE TRIGGER trg_edu_updated_at BEFORE UPDATE ON public.education_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.education_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edu_sel" ON public.education_progress FOR SELECT USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "edu_ins" ON public.education_progress FOR INSERT WITH CHECK (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "edu_upd" ON public.education_progress FOR UPDATE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "edu_del" ON public.education_progress FOR DELETE USING (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));

-- ---------- PATIENT_DATA_AUDIT_LOG ----------
CREATE TABLE IF NOT EXISTS public.patient_data_audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id      uuid NULL,
  device_id    text NULL,
  entity_type  text NOT NULL,
  entity_id    uuid NULL,
  action       text NOT NULL,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pdaudit_patient ON public.patient_data_audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_pdaudit_user    ON public.patient_data_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pdaudit_entity  ON public.patient_data_audit_log(entity_type, entity_id);
ALTER TABLE public.patient_data_audit_log ENABLE ROW LEVEL SECURITY;
-- Owners can insert their own audit rows; only admins can read.
CREATE POLICY "pdaudit_ins_owner" ON public.patient_data_audit_log FOR INSERT
WITH CHECK (user_id = auth.uid() OR device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "pdaudit_sel_admin" ON public.patient_data_audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- 4. STORAGE BUCKET for patient files
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('patient-records', 'patient-records', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — users/devices may only access files under their own folder.
-- Convention: storage path begins with `${user_id|device_id}/...`
CREATE POLICY "patient_records_owner_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-records'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (((current_setting('request.headers', true))::json ->> 'x-device-id') = (storage.foldername(name))[1])
  )
);

CREATE POLICY "patient_records_owner_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-records'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (((current_setting('request.headers', true))::json ->> 'x-device-id') = (storage.foldername(name))[1])
  )
);

CREATE POLICY "patient_records_owner_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'patient-records'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (((current_setting('request.headers', true))::json ->> 'x-device-id') = (storage.foldername(name))[1])
  )
);

CREATE POLICY "patient_records_owner_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patient-records'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (((current_setting('request.headers', true))::json ->> 'x-device-id') = (storage.foldername(name))[1])
  )
);

-- =========================================================================
-- 5. ATOMIC GUEST-CLAIM RPC
-- =========================================================================
CREATE OR REPLACE FUNCTION public.claim_guest_patient_data(_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _patient_id uuid;
  _claimed jsonb := '{}'::jsonb;
  _n int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _device_id IS NULL OR length(_device_id) < 8 THEN
    RAISE EXCEPTION 'Invalid device id';
  END IF;

  -- Ensure an active patient row exists for this user; reuse the device patient if possible.
  SELECT id INTO _patient_id
    FROM public.patients
   WHERE user_id = _uid AND active AND deleted_at IS NULL
   LIMIT 1;

  IF _patient_id IS NULL THEN
    SELECT id INTO _patient_id
      FROM public.patients
     WHERE user_id IS NULL AND device_id = _device_id AND active AND deleted_at IS NULL
     LIMIT 1;
    IF _patient_id IS NOT NULL THEN
      UPDATE public.patients SET user_id = _uid, updated_at = now() WHERE id = _patient_id;
    ELSE
      INSERT INTO public.patients(user_id, device_id, active)
        VALUES (_uid, _device_id, true)
        RETURNING id INTO _patient_id;
    END IF;
  END IF;

  -- Claim every domain table atomically.
  WITH u AS (UPDATE public.transport_tickets SET user_id = _uid, patient_id = COALESCE(patient_id, _patient_id), updated_at = now()
              WHERE user_id IS NULL AND device_id = _device_id RETURNING 1)
    SELECT count(*) INTO _n FROM u; _claimed := _claimed || jsonb_build_object('transport_tickets', _n);

  WITH u AS (UPDATE public.transport_flight_segments SET patient_id = COALESCE(patient_id, _patient_id)
              WHERE ticket_id IN (SELECT id FROM public.transport_tickets WHERE user_id = _uid) RETURNING 1)
    SELECT count(*) INTO _n FROM u; _claimed := _claimed || jsonb_build_object('transport_flight_segments', _n);

  WITH u AS (UPDATE public.medications SET user_id = _uid, patient_id = COALESCE(patient_id, _patient_id), updated_at = now()
              WHERE user_id IS NULL AND device_id = _device_id RETURNING 1)
    SELECT count(*) INTO _n FROM u; _claimed := _claimed || jsonb_build_object('medications', _n);

  WITH u AS (UPDATE public.medical_records SET user_id = _uid, patient_id = COALESCE(patient_id, _patient_id), updated_at = now()
              WHERE user_id IS NULL AND device_id = _device_id RETURNING 1)
    SELECT count(*) INTO _n FROM u; _claimed := _claimed || jsonb_build_object('medical_records', _n);

  WITH u AS (UPDATE public.appointments SET user_id = _uid, patient_id = COALESCE(patient_id, _patient_id), updated_at = now()
              WHERE user_id IS NULL AND device_id = _device_id RETURNING 1)
    SELECT count(*) INTO _n FROM u; _claimed := _claimed || jsonb_build_object('appointments', _n);

  WITH u AS (UPDATE public.allergies SET user_id = _uid, patient_id = COALESCE(patient_id, _patient_id), updated_at = now()
              WHERE user_id IS NULL AND device_id = _device_id RETURNING 1)
    SELECT count(*) INTO _n FROM u; _claimed := _claimed || jsonb_build_object('allergies', _n);

  WITH u AS (UPDATE public.journeys SET user_id = _uid, patient_id = COALESCE(patient_id, _patient_id), updated_at = now()
              WHERE user_id IS NULL AND device_id = _device_id RETURNING 1)
    SELECT count(*) INTO _n FROM u; _claimed := _claimed || jsonb_build_object('journeys', _n);

  WITH u AS (UPDATE public.care_plans SET user_id = _uid, patient_id = COALESCE(patient_id, _patient_id), updated_at = now()
              WHERE user_id IS NULL AND device_id = _device_id RETURNING 1)
    SELECT count(*) INTO _n FROM u; _claimed := _claimed || jsonb_build_object('care_plans', _n);

  WITH u AS (UPDATE public.education_progress SET user_id = _uid, patient_id = COALESCE(patient_id, _patient_id), updated_at = now()
              WHERE user_id IS NULL AND device_id = _device_id RETURNING 1)
    SELECT count(*) INTO _n FROM u; _claimed := _claimed || jsonb_build_object('education_progress', _n);

  -- Audit
  INSERT INTO public.patient_data_audit_log(patient_id, user_id, device_id, entity_type, action, metadata)
    VALUES (_patient_id, _uid, _device_id, 'patient', 'guest_claimed', _claimed);

  RETURN jsonb_build_object('patient_id', _patient_id, 'claimed', _claimed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_guest_patient_data(text) TO authenticated;

-- =========================================================================
-- 6. ENSURE-PATIENT RPC (idempotent helper for bootstrap)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.ensure_patient(_device_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
BEGIN
  IF _uid IS NOT NULL THEN
    SELECT id INTO _pid FROM public.patients
     WHERE user_id = _uid AND active AND deleted_at IS NULL LIMIT 1;
    IF _pid IS NULL THEN
      INSERT INTO public.patients(user_id, device_id, active) VALUES (_uid, _device_id, true)
        RETURNING id INTO _pid;
    END IF;
    RETURN _pid;
  END IF;

  IF _device_id IS NULL OR length(_device_id) < 8 THEN
    RAISE EXCEPTION 'Invalid device id';
  END IF;
  SELECT id INTO _pid FROM public.patients
   WHERE user_id IS NULL AND device_id = _device_id AND active AND deleted_at IS NULL LIMIT 1;
  IF _pid IS NULL THEN
    INSERT INTO public.patients(device_id, active) VALUES (_device_id, true)
      RETURNING id INTO _pid;
  END IF;
  RETURN _pid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_patient(text) TO anon, authenticated;
