-- Scanner upload QC telemetry RPC (sanitized).
-- Writes to existing qc_crash_events for every stage and qc_test_runs for terminal
-- save_completed / save_failed events. Heavy / sensitive data is rejected client-side
-- and clamped server-side so that no document content, OCR text, full filenames or
-- patient identifiers can land in QC tables.

CREATE OR REPLACE FUNCTION public.log_scanner_qc_event(
  _stage text,
  _scenario text,
  _storage_mode text DEFAULT NULL,
  _file_count integer DEFAULT NULL,
  _total_bytes bigint DEFAULT NULL,
  _largest_file_bytes bigint DEFAULT NULL,
  _mime_families text[] DEFAULT NULL,
  _quota_estimate_bytes bigint DEFAULT NULL,
  _platform text DEFAULT 'web',
  _device_hash text DEFAULT NULL,
  _build_version text DEFAULT 'client-telemetry',
  _error_name text DEFAULT NULL,
  _error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage text := left(coalesce(nullif(_stage, ''), 'unknown'), 60);
  v_scenario text := left(coalesce(nullif(_scenario, ''), 'unknown'), 24);
  v_storage_mode text := left(coalesce(nullif(_storage_mode, ''), 'unspecified'), 24);
  v_platform text := left(coalesce(nullif(_platform, ''), 'web'), 24);
  v_device_hash text := left(coalesce(nullif(_device_hash, ''), 'unknown'), 80);
  v_build text := left(coalesce(nullif(_build_version, ''), 'client-telemetry'), 60);
  v_error_name text := left(coalesce(nullif(_error_name, ''), ''), 120);
  v_error_message text := left(coalesce(nullif(_error_message, ''), ''), 240);
  v_file_count integer := greatest(0, coalesce(_file_count, 0));
  v_total bigint := greatest(0, coalesce(_total_bytes, 0));
  v_largest bigint := greatest(0, coalesce(_largest_file_bytes, 0));
  v_quota bigint := greatest(0, coalesce(_quota_estimate_bytes, 0));
  v_mimes text[] := coalesce(_mime_families, ARRAY[]::text[]);
  v_is_failure boolean := v_stage IN ('save_failed','indexeddb_store_failed','quota_exceeded','finalize_failed');
  v_is_terminal_success boolean := v_stage = 'save_completed';
BEGIN
  -- Cap MIME families array length to keep telemetry small.
  IF array_length(v_mimes, 1) > 8 THEN
    v_mimes := v_mimes[1:8];
  END IF;

  INSERT INTO public.qc_crash_events (
    source, platform, device, error_name, error_message, metadata, status
  ) VALUES (
    'scanner_upload',
    v_platform,
    v_device_hash,
    nullif(v_error_name, ''),
    CASE WHEN v_error_message <> '' THEN v_error_message
         ELSE concat('Scanner stage: ', v_stage) END,
    jsonb_build_object(
      'event_type', 'scanner_upload',
      'stage', v_stage,
      'scenario', v_scenario,
      'storage_mode', v_storage_mode,
      'file_count', v_file_count,
      'total_bytes', v_total,
      'largest_file_bytes', v_largest,
      'mime_families', to_jsonb(v_mimes),
      'quota_estimate_bytes', v_quota,
      'build_version', v_build
    ),
    CASE WHEN v_is_failure THEN 'new'::qc_event_status
         ELSE 'new'::qc_event_status END
  );

  IF v_is_terminal_success OR v_is_failure THEN
    INSERT INTO public.qc_test_runs (
      build_version, platform, device, scenario, result, case_subtags, notes
    ) VALUES (
      v_build,
      v_platform,
      v_device_hash,
      concat('Scanner ', v_scenario, ' run · ', v_stage),
      CASE WHEN v_is_failure THEN 'fail'::qc_run_result ELSE 'pass'::qc_run_result END,
      ARRAY['scanner-upload', v_scenario, v_storage_mode],
      concat(
        'files=', v_file_count,
        '; total=', v_total,
        '; largest=', v_largest,
        '; quota=', v_quota,
        CASE WHEN v_error_name <> '' THEN concat('; error=', v_error_name) ELSE '' END
      )
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Telemetry must never fail callers. Swallow any insert errors silently.
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.log_scanner_qc_event(
  text, text, text, integer, bigint, bigint, text[], bigint, text, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_scanner_qc_event(
  text, text, text, integer, bigint, bigint, text[], bigint, text, text, text, text, text
) TO anon, authenticated;