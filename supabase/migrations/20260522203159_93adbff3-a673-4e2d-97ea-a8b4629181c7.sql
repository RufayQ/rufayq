CREATE OR REPLACE FUNCTION public.security_findings_upsert_scoped(_scanner_name TEXT, _findings JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seen_keys TEXT[] := ARRAY[]::TEXT[];
  rec JSONB;
  processed INT := 0;
BEGIN
  IF _scanner_name IS NULL OR length(_scanner_name) = 0 THEN
    RAISE EXCEPTION 'scanner_name required';
  END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(COALESCE(_findings, '[]'::jsonb)) LOOP
    seen_keys := array_append(seen_keys, rec->>'internal_id');
    INSERT INTO public.security_findings(scanner_name, internal_id, title, severity, description, metadata, last_seen_at)
    VALUES (
      _scanner_name,
      rec->>'internal_id',
      COALESCE(rec->>'title', rec->>'internal_id'),
      COALESCE(rec->>'severity', 'medium'),
      rec->>'description',
      COALESCE(rec->'metadata', '{}'::jsonb),
      now()
    )
    ON CONFLICT (scanner_name, internal_id) DO UPDATE
      SET title = EXCLUDED.title,
          severity = EXCLUDED.severity,
          description = EXCLUDED.description,
          metadata = EXCLUDED.metadata,
          last_seen_at = now(),
          status = CASE WHEN public.security_findings.status = 'fixed' THEN 'open' ELSE public.security_findings.status END,
          resolved_at = CASE WHEN public.security_findings.status = 'fixed' THEN NULL ELSE public.security_findings.resolved_at END;
    processed := processed + 1;
  END LOOP;

  -- Within this scanner only: mark open findings not seen this run as fixed.
  UPDATE public.security_findings
     SET status = 'fixed', resolved_at = now()
   WHERE scanner_name = _scanner_name
     AND status = 'open'
     AND internal_id <> ALL(seen_keys);

  RETURN processed;
END $$;

REVOKE ALL ON FUNCTION public.security_findings_upsert_scoped(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.security_findings_upsert_scoped(TEXT, JSONB) TO service_role;

-- Read-only helpers the nightly rescan uses (service role only).
CREATE OR REPLACE FUNCTION public.security_rescan_collect()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  r RECORD;
BEGIN
  -- 1. Tables in public schema without RLS enabled
  FOR r IN
    SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relrowsecurity = false
       AND c.relname NOT LIKE 'pg_%'
  LOOP
    result := result || jsonb_build_object(
      'internal_id', 'rls_disabled:' || r.table_name,
      'title', 'Table public.' || r.table_name || ' has RLS disabled',
      'severity', 'high',
      'description', 'Row Level Security is not enabled on public.' || r.table_name || '. Enable RLS and add policies, or move the table out of the API schema.'
    );
  END LOOP;

  -- 2. Permissive policies in public schema: qual or with_check evaluates to literal true
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (
         btrim(COALESCE(qual, ''))       IN ('true','(true)','TRUE','(TRUE)')
         OR btrim(COALESCE(with_check, '')) IN ('true','(true)','TRUE','(TRUE)')
       )
  LOOP
    result := result || jsonb_build_object(
      'internal_id', 'permissive_policy:' || r.tablename || ':' || r.policyname,
      'title', 'Permissive policy on public.' || r.tablename || ' (' || r.policyname || ')',
      'severity', 'medium',
      'description', 'Policy "' || r.policyname || '" on public.' || r.tablename
        || ' (' || r.cmd || ') uses an unconditional TRUE expression. Verify the table is intentionally public; otherwise tighten the USING / WITH CHECK clause.'
    );
  END LOOP;

  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.security_rescan_collect() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.security_rescan_collect() TO service_role;