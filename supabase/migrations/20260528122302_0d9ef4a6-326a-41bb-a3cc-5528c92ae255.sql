ALTER TABLE public.qc_test_runs
  ADD COLUMN IF NOT EXISTS screenshot_paths text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.qc_test_runs.screenshot_paths IS
  'Storage paths in the qc-attachments bucket for screenshots / DOM snapshots attached by automated E2E runs. Categorized by milestone via case_subtags.';