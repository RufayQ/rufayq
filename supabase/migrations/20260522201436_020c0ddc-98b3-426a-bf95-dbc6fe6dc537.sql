
-- ============ security_findings table ============
CREATE TABLE IF NOT EXISTS public.security_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_name TEXT NOT NULL,
  internal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','fixed','ignored')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scanner_name, internal_id)
);

CREATE INDEX IF NOT EXISTS idx_security_findings_status ON public.security_findings(status);
CREATE INDEX IF NOT EXISTS idx_security_findings_severity ON public.security_findings(severity);
CREATE INDEX IF NOT EXISTS idx_security_findings_last_seen ON public.security_findings(last_seen_at DESC);

ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read findings" ON public.security_findings;
CREATE POLICY "Admins read findings" ON public.security_findings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins write findings" ON public.security_findings;
CREATE POLICY "Admins write findings" ON public.security_findings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_security_findings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_security_findings_updated_at ON public.security_findings;
CREATE TRIGGER trg_security_findings_updated_at
BEFORE UPDATE ON public.security_findings
FOR EACH ROW EXECUTE FUNCTION public.tg_security_findings_updated_at();

-- ============ Upsert (used by sync edge function via service role) ============
CREATE OR REPLACE FUNCTION public.security_findings_upsert(_findings JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seen_keys TEXT[] := ARRAY[]::TEXT[];
  rec JSONB;
  inserted_count INT := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(_findings) LOOP
    seen_keys := array_append(seen_keys, (rec->>'scanner_name') || '|' || (rec->>'internal_id'));
    INSERT INTO public.security_findings(scanner_name, internal_id, title, severity, description, metadata, last_seen_at)
    VALUES (
      rec->>'scanner_name',
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
    inserted_count := inserted_count + 1;
  END LOOP;

  -- Mark previously-open findings missing from this scan as fixed
  UPDATE public.security_findings
     SET status = 'fixed', resolved_at = now()
   WHERE status = 'open'
     AND (scanner_name || '|' || internal_id) <> ALL(seen_keys);

  RETURN inserted_count;
END $$;

REVOKE ALL ON FUNCTION public.security_findings_upsert(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.security_findings_upsert(JSONB) TO authenticated;

-- ============ Status change (admin only) ============
CREATE OR REPLACE FUNCTION public.security_finding_set_status(_id UUID, _status TEXT, _note TEXT DEFAULT NULL)
RETURNS public.security_findings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE row public.security_findings;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _status NOT IN ('open','fixed','ignored') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE public.security_findings
     SET status = _status,
         resolution_note = COALESCE(_note, resolution_note),
         resolved_at = CASE WHEN _status IN ('fixed','ignored') THEN now() ELSE NULL END
   WHERE id = _id
  RETURNING * INTO row;

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'security_finding.status', 'security_finding', _id::text,
          jsonb_build_object('status', _status, 'note', _note));

  RETURN row;
END $$;

REVOKE ALL ON FUNCTION public.security_finding_set_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.security_finding_set_status(UUID, TEXT, TEXT) TO authenticated;

-- ============ Cron secret helpers ============
-- Admin sets the CRON_SECRET in vault (must match the edge-function env secret).
CREATE OR REPLACE FUNCTION public.set_cron_secret(_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE existing UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT id INTO existing FROM vault.secrets WHERE name = 'CRON_SECRET' LIMIT 1;
  IF existing IS NULL THEN
    PERFORM vault.create_secret(_value, 'CRON_SECRET');
  ELSE
    PERFORM vault.update_secret(existing, _value, 'CRON_SECRET');
  END IF;
  RETURN TRUE;
END $$;

REVOKE ALL ON FUNCTION public.set_cron_secret(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_cron_secret(TEXT) TO authenticated;

-- Constant-time-ish check that a provided plaintext matches the vault secret.
CREATE OR REPLACE FUNCTION public.verify_cron_secret(_provided TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE stored TEXT;
BEGIN
  SELECT decrypted_secret INTO stored
    FROM vault.decrypted_secrets
   WHERE name = 'CRON_SECRET'
   LIMIT 1;
  RETURN stored IS NOT NULL AND stored = _provided;
END $$;

REVOKE ALL ON FUNCTION public.verify_cron_secret(TEXT) FROM PUBLIC;
-- Only the service role (edge functions) should call this:
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(TEXT) TO service_role;
