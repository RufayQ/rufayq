CREATE OR REPLACE FUNCTION public.log_attach_error_event(
  _stage text,
  _route text,
  _device_hash text,
  _row_id_short text,
  _error_name text,
  _recurrent_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage text := left(coalesce(nullif(_stage, ''), 'unknown'), 80);
  v_route text := left(coalesce(nullif(_route, ''), 'unknown'), 120);
  v_device_hash text := left(coalesce(nullif(_device_hash, ''), 'unknown'), 80);
  v_row_id_short text := left(coalesce(nullif(_row_id_short, ''), 'unknown'), 24);
  v_error_name text := left(coalesce(nullif(_error_name, ''), 'Error'), 120);
  v_key text := left(coalesce(nullif(_recurrent_key, ''), concat(v_route, ':', v_stage, ':', v_error_name)), 240);
  v_seen integer := 0;
  v_is_recurrent boolean := false;
BEGIN
  SELECT count(*)::integer INTO v_seen
  FROM public.qc_crash_events
  WHERE metadata->>'event_type' = 'attach_from_records_failure'
    AND metadata->>'recurrent_key' = v_key
    AND created_at > now() - interval '30 days';

  v_is_recurrent := v_seen > 0;

  INSERT INTO public.qc_crash_events (
    source,
    platform,
    device,
    error_name,
    error_message,
    metadata,
    status
  ) VALUES (
    'react_error_boundary',
    'web',
    v_device_hash,
    v_error_name,
    concat('Attachment flow failed at ', v_stage),
    jsonb_build_object(
      'event_type', 'attach_from_records_failure',
      'stage', v_stage,
      'route', v_route,
      'device_hash', v_device_hash,
      'row_id_short', v_row_id_short,
      'error_name', v_error_name,
      'recurrent_key', v_key,
      'recurrent', v_is_recurrent,
      'seen_last_30d_before_insert', v_seen
    ),
    'new'
  );

  IF v_is_recurrent THEN
    INSERT INTO public.qc_test_runs (
      build_version,
      platform,
      device,
      scenario,
      result,
      case_subtags,
      notes
    ) VALUES (
      'client-telemetry',
      'web',
      v_device_hash,
      concat('Recurrent Attach from My Records failure: ', v_route, ' / ', v_stage),
      'fail',
      ARRAY['attach-from-records', 'journey', 'recurrent'],
      concat('Sanitized recurrence: route=', v_route, '; stage=', v_stage, '; row=', v_row_id_short, '; error=', v_error_name)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.log_attach_error_event(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_attach_error_event(text, text, text, text, text, text) TO anon, authenticated;