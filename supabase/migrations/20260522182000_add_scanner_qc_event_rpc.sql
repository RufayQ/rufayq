CREATE OR REPLACE FUNCTION public.log_scanner_qc_event(
  _stage text,
  _scenario text,
  _storage_mode text,
  _file_count integer,
  _total_bytes bigint,
  _largest_file_bytes bigint,
  _mime_families text[] DEFAULT ARRAY[]::text[],
  _quota_estimate_bytes bigint DEFAULT NULL,
  _error_name text DEFAULT NULL,
  _error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage text := left(coalesce(nullif(_stage, ''), 'unknown'), 80);
  v_scenario text := left(coalesce(nullif(_scenario, ''), 'single'), 40);
  v_storage text := left(coalesce(nullif(_storage_mode, ''), 'memory'), 40);
  v_error_name text := left(coalesce(_error_name, 'scanner_stage'), 120);
  v_error_message text := left(coalesce(_error_message, ''), 240);
BEGIN
  INSERT INTO public.qc_crash_events (
    source, platform, device, error_name, error_message, metadata, status
  ) VALUES (
    'scanner_telemetry',
    'web',
    'scanner',
    v_error_name,
    CASE WHEN v_error_message = '' THEN concat('Scanner stage: ', v_stage) ELSE v_error_message END,
    jsonb_build_object(
      'event_type', 'scanner_upload_stage',
      'stage', v_stage,
      'scenario', v_scenario,
      'storage_mode', v_storage,
      'file_count', greatest(_file_count, 0),
      'total_bytes', greatest(_total_bytes, 0),
      'largest_file_bytes', greatest(_largest_file_bytes, 0),
      'mime_families', coalesce(to_jsonb(_mime_families), '[]'::jsonb),
      'quota_estimate_bytes', _quota_estimate_bytes
    ),
    'new'
  );

  IF v_stage IN ('save_completed', 'save_failed') THEN
    INSERT INTO public.qc_test_runs (
      build_version, platform, device, scenario, result, case_subtags, notes
    ) VALUES (
      'client-telemetry',
      'web',
      'scanner',
      concat('Scanner ', v_scenario),
      CASE WHEN v_stage = 'save_completed' THEN 'pass' ELSE 'fail' END,
      ARRAY['scanner', v_storage, v_stage],
      concat('files=', greatest(_file_count, 0), '; bytes=', greatest(_total_bytes, 0), '; largest=', greatest(_largest_file_bytes, 0))
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.log_scanner_qc_event(text, text, text, integer, bigint, bigint, text[], bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_scanner_qc_event(text, text, text, integer, bigint, bigint, text[], bigint, text, text) TO anon, authenticated;
