
-- Push campaigns: bilingual segmented in-app push composer
CREATE TABLE public.push_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ar TEXT,
  body TEXT,
  body_ar TEXT,
  link TEXT,
  kind TEXT NOT NULL DEFAULT 'announcement',
  audience JSONB NOT NULL DEFAULT '{"all":true,"countries":[],"plans":[],"roles":["patient"]}'::jsonb,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global','org')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed','cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  audience_size INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_msg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_campaigns_status_sched ON public.push_campaigns(status, scheduled_at);
CREATE INDEX idx_push_campaigns_org ON public.push_campaigns(organization_id);

CREATE TABLE public.push_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.push_campaigns(id) ON DELETE CASCADE,
  patient_device_id TEXT NOT NULL,
  notification_id UUID,
  status TEXT NOT NULL DEFAULT 'delivered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcr_campaign ON public.push_campaign_recipients(campaign_id);

ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage all push campaigns" ON public.push_campaigns
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "org staff read own org campaigns" ON public.push_campaigns
  FOR SELECT TO authenticated
  USING (scope='org' AND organization_id IN (SELECT public.user_org_ids(auth.uid())));

CREATE POLICY "org staff insert own org campaigns" ON public.push_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (scope='org' AND organization_id IN (SELECT public.user_org_ids(auth.uid())) AND created_by = auth.uid());

CREATE POLICY "org staff update own org draft" ON public.push_campaigns
  FOR UPDATE TO authenticated
  USING (scope='org' AND organization_id IN (SELECT public.user_org_ids(auth.uid())))
  WITH CHECK (scope='org' AND organization_id IN (SELECT public.user_org_ids(auth.uid())));

CREATE POLICY "admins manage all recipients" ON public.push_campaign_recipients
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "org staff read own org recipients" ON public.push_campaign_recipients
  FOR SELECT TO authenticated
  USING (campaign_id IN (
    SELECT id FROM public.push_campaigns
    WHERE scope='org' AND organization_id IN (SELECT public.user_org_ids(auth.uid()))
  ));

CREATE TRIGGER push_campaigns_updated
  BEFORE UPDATE ON public.push_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audience resolver: returns set of patient device_ids
CREATE OR REPLACE FUNCTION public.push_resolve_devices(_audience JSONB, _scope TEXT, _org UUID)
RETURNS TABLE(device_id TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _all BOOLEAN := COALESCE((_audience->>'all')::boolean, false);
  _countries TEXT[] := COALESCE(ARRAY(SELECT jsonb_array_elements_text(_audience->'countries')), ARRAY[]::TEXT[]);
  _plans TEXT[] := COALESCE(ARRAY(SELECT jsonb_array_elements_text(_audience->'plans')), ARRAY[]::TEXT[]);
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.device_id::TEXT
  FROM public.profiles p
  WHERE p.deleted_at IS NULL
    AND p.device_id IS NOT NULL AND p.device_id <> ''
    AND (_all OR cardinality(_countries) > 0 OR cardinality(_plans) > 0 OR _scope='org')
    AND (cardinality(_countries) = 0 OR p.nationality = ANY(_countries))
    AND (cardinality(_plans) = 0 OR EXISTS (
        SELECT 1 FROM public.user_subscriptions us
        WHERE us.device_id = p.device_id
          AND us.status = 'active'
          AND us.plan = ANY(_plans)
    ))
    AND (_scope <> 'org' OR _org IS NULL OR EXISTS (
        SELECT 1 FROM public.patient_consents pc
        WHERE pc.patient_device_id = p.device_id AND pc.organization_id = _org AND pc.granted = true
    ));
END;
$$;

-- Estimate audience size
CREATE OR REPLACE FUNCTION public.push_estimate_audience(_audience JSONB, _scope TEXT, _org UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _n INTEGER;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin')
       OR (_scope='org' AND _org IS NOT NULL AND public.is_org_member(auth.uid(), _org))) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT COUNT(*) INTO _n FROM public.push_resolve_devices(_audience, _scope, _org);
  RETURN COALESCE(_n,0);
END;
$$;

-- Send a campaign immediately (idempotent: marks status sending → sent)
CREATE OR REPLACE FUNCTION public.push_campaign_send(_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.push_campaigns%ROWTYPE;
  _dev TEXT;
  _nid UUID;
  _delivered INT := 0;
BEGIN
  SELECT * INTO c FROM public.push_campaigns WHERE id = _campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin')
       OR (c.scope='org' AND c.organization_id IS NOT NULL AND public.is_org_member(auth.uid(), c.organization_id))) THEN
    RAISE EXCEPTION 'Not authorized to send this campaign';
  END IF;
  IF c.status NOT IN ('draft','scheduled') THEN
    RAISE EXCEPTION 'Campaign already %', c.status;
  END IF;

  UPDATE public.push_campaigns SET status='sending', updated_at=now() WHERE id = _campaign_id;

  FOR _dev IN SELECT d.device_id FROM public.push_resolve_devices(c.audience, c.scope, c.organization_id) d
  LOOP
    INSERT INTO public.patient_notifications(
      patient_device_id, organization_id, kind, title, title_ar, body, body_ar, link
    ) VALUES (
      _dev, c.organization_id, COALESCE(c.kind,'announcement'),
      c.title, c.title_ar, c.body, c.body_ar, c.link
    ) RETURNING id INTO _nid;
    INSERT INTO public.push_campaign_recipients(campaign_id, patient_device_id, notification_id)
    VALUES (_campaign_id, _dev, _nid);
    _delivered := _delivered + 1;
  END LOOP;

  UPDATE public.push_campaigns
    SET status='sent', sent_at=now(),
        audience_size = _delivered, delivered_count = _delivered,
        updated_at = now()
    WHERE id = _campaign_id;

  PERFORM public.log_audit_event('push_campaign_sent','push_campaign',_campaign_id::text,
    jsonb_build_object('delivered',_delivered,'audience',c.audience));

  RETURN jsonb_build_object('delivered', _delivered);
END;
$$;

-- Test send to current admin user (looks up their device via profiles.user_id)
CREATE OR REPLACE FUNCTION public.push_campaign_test_send(_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.push_campaigns%ROWTYPE;
  _dev TEXT;
  _nid UUID;
BEGIN
  SELECT * INTO c FROM public.push_campaigns WHERE id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin')
       OR (c.scope='org' AND c.organization_id IS NOT NULL AND public.is_org_member(auth.uid(), c.organization_id))) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT device_id INTO _dev FROM public.profiles WHERE user_id = auth.uid() AND device_id IS NOT NULL LIMIT 1;
  IF _dev IS NULL THEN
    _dev := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'),'');
  END IF;
  IF _dev IS NULL THEN RAISE EXCEPTION 'No device found for current user — open the patient app first'; END IF;

  INSERT INTO public.patient_notifications(
    patient_device_id, organization_id, kind, title, title_ar, body, body_ar, link
  ) VALUES (
    _dev, c.organization_id, COALESCE(c.kind,'announcement'),
    '[TEST] ' || c.title, '[تجربة] ' || COALESCE(c.title_ar, c.title),
    c.body, c.body_ar, c.link
  ) RETURNING id INTO _nid;

  RETURN jsonb_build_object('device_id', _dev, 'notification_id', _nid);
END;
$$;

-- Cancel a scheduled campaign
CREATE OR REPLACE FUNCTION public.push_campaign_cancel(_campaign_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.push_campaigns%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.push_campaigns WHERE id = _campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin')
       OR (c.scope='org' AND c.organization_id IS NOT NULL AND public.is_org_member(auth.uid(), c.organization_id))) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF c.status <> 'scheduled' THEN RAISE EXCEPTION 'Only scheduled campaigns can be cancelled'; END IF;
  UPDATE public.push_campaigns SET status='cancelled', updated_at=now() WHERE id = _campaign_id;
END;
$$;
