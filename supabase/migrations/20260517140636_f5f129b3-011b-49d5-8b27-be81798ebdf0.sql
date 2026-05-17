-- ============================================================================
-- Quality Control: enums
-- ============================================================================
CREATE TYPE public.qc_bug_status AS ENUM (
  'open','in_progress','fixed','validated','closed','wont_fix'
);

CREATE TYPE public.qc_bug_severity AS ENUM (
  'blocker','critical','major','minor','trivial'
);

CREATE TYPE public.qc_run_result AS ENUM (
  'pass','fail','blocked','skipped'
);

CREATE TYPE public.qc_crash_event_status AS ENUM (
  'new','triaged','linked_to_bug','ignored'
);

-- ============================================================================
-- Helper: any QC staff predicate (admin OR moderator OR qc_tester)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_qc_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'moderator'::public.app_role)
    OR public.has_role(_user_id, 'qc_tester'::public.app_role);
$$;

REVOKE EXECUTE ON FUNCTION public.is_qc_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_qc_staff(uuid) TO authenticated;

-- ============================================================================
-- qc_test_runs
-- ============================================================================
CREATE TABLE public.qc_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  build_version text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web','ios','android')),
  device text,
  scenario text NOT NULL,
  result public.qc_run_result NOT NULL,
  case_code smallint CHECK (case_code BETWEEN 1 AND 6),
  case_subtags text[] NOT NULL DEFAULT '{}',
  notes text,
  smoke_report text,
  logcat_excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qc_test_runs_created_idx ON public.qc_test_runs (created_at DESC);
CREATE INDEX qc_test_runs_platform_idx ON public.qc_test_runs (platform);

-- ============================================================================
-- qc_bugs
-- ============================================================================
CREATE TABLE public.qc_bugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  test_run_id uuid REFERENCES public.qc_test_runs(id) ON DELETE SET NULL,
  crash_event_id uuid,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','smoke_report','system_crash')),
  title text NOT NULL,
  description text NOT NULL,
  severity public.qc_bug_severity NOT NULL DEFAULT 'major',
  status public.qc_bug_status NOT NULL DEFAULT 'open',
  platform text CHECK (platform IN ('web','ios','android')),
  build_version text,
  case_code smallint CHECK (case_code BETWEEN 1 AND 6),
  case_subtags text[] NOT NULL DEFAULT '{}',
  screenshot_paths text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qc_bugs_status_idx ON public.qc_bugs (status);
CREATE INDEX qc_bugs_severity_idx ON public.qc_bugs (severity);
CREATE INDEX qc_bugs_created_idx ON public.qc_bugs (created_at DESC);
CREATE INDEX qc_bugs_assignee_idx ON public.qc_bugs (assignee_id);

-- ============================================================================
-- qc_bug_validations
-- ============================================================================
CREATE TABLE public.qc_bug_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id uuid NOT NULL REFERENCES public.qc_bugs(id) ON DELETE CASCADE,
  validator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  build_version text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('validated','still_broken','cannot_reproduce')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qc_bug_validations_bug_idx ON public.qc_bug_validations (bug_id, created_at DESC);

-- ============================================================================
-- qc_crash_events
-- ============================================================================
CREATE TABLE public.qc_crash_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN (
    'react_error_boundary','unhandled_rejection','android_smoke','native_logcat','backend_job'
  )),
  platform text CHECK (platform IN ('web','ios','android')),
  build_version text,
  device text,
  app_version text,
  case_code smallint CHECK (case_code BETWEEN 1 AND 6),
  case_subtags text[] NOT NULL DEFAULT '{}',
  error_name text,
  error_message text,
  stack text,
  log_excerpt text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.qc_crash_event_status NOT NULL DEFAULT 'new',
  linked_bug_id uuid REFERENCES public.qc_bugs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  triaged_at timestamptz,
  triaged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX qc_crash_events_status_idx ON public.qc_crash_events (status);
CREATE INDEX qc_crash_events_created_idx ON public.qc_crash_events (created_at DESC);

ALTER TABLE public.qc_bugs
  ADD CONSTRAINT qc_bugs_crash_event_id_fkey
  FOREIGN KEY (crash_event_id)
  REFERENCES public.qc_crash_events(id)
  ON DELETE SET NULL;

-- ============================================================================
-- Stamping triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.qc_stamp_reporter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.reporter_id IS NULL THEN
    NEW.reporter_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.qc_stamp_validator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.validator_id IS NULL THEN
    NEW.validator_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER qc_test_runs_stamp_reporter
  BEFORE INSERT ON public.qc_test_runs
  FOR EACH ROW EXECUTE FUNCTION public.qc_stamp_reporter();

CREATE TRIGGER qc_bugs_stamp_reporter
  BEFORE INSERT ON public.qc_bugs
  FOR EACH ROW EXECUTE FUNCTION public.qc_stamp_reporter();

CREATE TRIGGER qc_bug_validations_stamp_validator
  BEFORE INSERT ON public.qc_bug_validations
  FOR EACH ROW EXECUTE FUNCTION public.qc_stamp_validator();

CREATE TRIGGER qc_bugs_updated_at
  BEFORE UPDATE ON public.qc_bugs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Enable RLS + policies
-- ============================================================================
ALTER TABLE public.qc_test_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_bugs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_bug_validations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_crash_events     ENABLE ROW LEVEL SECURITY;

-- qc_test_runs
CREATE POLICY "qc staff can view test runs" ON public.qc_test_runs
  FOR SELECT TO authenticated USING (public.is_qc_staff(auth.uid()));
CREATE POLICY "qc staff can insert test runs" ON public.qc_test_runs
  FOR INSERT TO authenticated WITH CHECK (public.is_qc_staff(auth.uid()));
CREATE POLICY "qc staff can update test runs" ON public.qc_test_runs
  FOR UPDATE TO authenticated USING (public.is_qc_staff(auth.uid())) WITH CHECK (public.is_qc_staff(auth.uid()));
CREATE POLICY "admins can delete test runs" ON public.qc_test_runs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- qc_bugs
CREATE POLICY "qc staff can view bugs" ON public.qc_bugs
  FOR SELECT TO authenticated USING (public.is_qc_staff(auth.uid()));
CREATE POLICY "qc staff can insert bugs" ON public.qc_bugs
  FOR INSERT TO authenticated WITH CHECK (public.is_qc_staff(auth.uid()));
CREATE POLICY "qc staff can update bugs" ON public.qc_bugs
  FOR UPDATE TO authenticated USING (public.is_qc_staff(auth.uid())) WITH CHECK (public.is_qc_staff(auth.uid()));
CREATE POLICY "admins can delete bugs" ON public.qc_bugs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- qc_bug_validations
CREATE POLICY "qc staff can view validations" ON public.qc_bug_validations
  FOR SELECT TO authenticated USING (public.is_qc_staff(auth.uid()));
CREATE POLICY "qc staff can insert validations" ON public.qc_bug_validations
  FOR INSERT TO authenticated WITH CHECK (public.is_qc_staff(auth.uid()));
CREATE POLICY "qc staff can update validations" ON public.qc_bug_validations
  FOR UPDATE TO authenticated USING (public.is_qc_staff(auth.uid())) WITH CHECK (public.is_qc_staff(auth.uid()));
CREATE POLICY "admins can delete validations" ON public.qc_bug_validations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- qc_crash_events  (no public INSERT; service role / SECURITY DEFINER RPC only)
CREATE POLICY "qc staff can view crash events" ON public.qc_crash_events
  FOR SELECT TO authenticated USING (public.is_qc_staff(auth.uid()));
CREATE POLICY "qc staff can update crash events" ON public.qc_crash_events
  FOR UPDATE TO authenticated USING (public.is_qc_staff(auth.uid())) WITH CHECK (public.is_qc_staff(auth.uid()));
CREATE POLICY "admins can delete crash events" ON public.qc_crash_events
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================================
-- Storage bucket: qc-attachments (private)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('qc-attachments','qc-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "qc staff can read attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'qc-attachments' AND public.is_qc_staff(auth.uid()));

CREATE POLICY "qc staff can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'qc-attachments' AND public.is_qc_staff(auth.uid()));

CREATE POLICY "qc staff can update attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'qc-attachments' AND public.is_qc_staff(auth.uid()));

CREATE POLICY "admins can delete attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'qc-attachments' AND public.has_role(auth.uid(), 'admin'::public.app_role));