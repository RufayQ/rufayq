-- Chat system: AI personas + care providers + user-to-user
-- All actors keyed by device_id (patient app is device-based) or organization_id (providers).

-- 1. Discoverability opt-in on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discoverable_by_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discoverable_by_phone boolean NOT NULL DEFAULT false;

-- 2. Thread kinds
DO $$ BEGIN
  CREATE TYPE public.chat_thread_kind AS ENUM ('ai','direct','provider');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_sender_kind AS ENUM ('patient','org_member','ai','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Threads
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.chat_thread_kind NOT NULL,
  title text,
  ai_persona text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text
);
CREATE INDEX IF NOT EXISTS idx_chat_threads_last ON public.chat_threads(last_message_at DESC);

-- 4. Participants
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  device_id text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name text,
  last_read_at timestamptz,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_participants_actor_ck CHECK (
    (device_id IS NOT NULL AND organization_id IS NULL) OR
    (device_id IS NULL AND organization_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_chat_participants_thread ON public.chat_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_device ON public.chat_participants(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_participants_org ON public.chat_participants(organization_id) WHERE organization_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_participants_device ON public.chat_participants(thread_id, device_id) WHERE device_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_participants_org ON public.chat_participants(thread_id, organization_id) WHERE organization_id IS NOT NULL;

-- 5. Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_kind public.chat_sender_kind NOT NULL,
  sender_device_id text,
  sender_user_id uuid,
  sender_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON public.chat_messages(thread_id, created_at DESC);

-- 6. Helper: does caller participate in thread?
CREATE OR REPLACE FUNCTION public.chat_caller_participates(_thread_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _hdr_device text;
  _uid uuid;
BEGIN
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  _uid := auth.uid();
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.thread_id = _thread_id
      AND (
        (_hdr_device IS NOT NULL AND cp.device_id = _hdr_device)
        OR (_uid IS NOT NULL AND cp.organization_id IS NOT NULL AND public.is_org_member(_uid, cp.organization_id))
      )
  );
END $$;

-- 7. RLS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view threads" ON public.chat_threads;
CREATE POLICY "Participants view threads" ON public.chat_threads FOR SELECT
  USING (public.chat_caller_participates(id) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Participants update threads" ON public.chat_threads;
CREATE POLICY "Participants update threads" ON public.chat_threads FOR UPDATE
  USING (public.chat_caller_participates(id))
  WITH CHECK (public.chat_caller_participates(id));

DROP POLICY IF EXISTS "Participants view participants" ON public.chat_participants;
CREATE POLICY "Participants view participants" ON public.chat_participants FOR SELECT
  USING (public.chat_caller_participates(thread_id) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Participants update own row" ON public.chat_participants;
CREATE POLICY "Participants update own row" ON public.chat_participants FOR UPDATE
  USING (
    (device_id IS NOT NULL AND device_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), ''))
    OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
  );

DROP POLICY IF EXISTS "Participants view messages" ON public.chat_messages;
CREATE POLICY "Participants view messages" ON public.chat_messages FOR SELECT
  USING (public.chat_caller_participates(thread_id) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Participants insert messages" ON public.chat_messages;
CREATE POLICY "Participants insert messages" ON public.chat_messages FOR INSERT
  WITH CHECK (
    public.chat_caller_participates(thread_id)
    AND (
      (sender_kind IN ('patient','ai','system')
        AND sender_device_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), ''))
      OR (sender_kind = 'org_member'
        AND sender_org_id IS NOT NULL AND public.is_org_member(auth.uid(), sender_org_id))
    )
  );

DROP POLICY IF EXISTS "Senders soft-delete own messages" ON public.chat_messages;
CREATE POLICY "Senders soft-delete own messages" ON public.chat_messages FOR UPDATE
  USING (
    (sender_device_id IS NOT NULL AND sender_device_id = NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), ''))
    OR (sender_org_id IS NOT NULL AND public.is_org_member(auth.uid(), sender_org_id))
  );

-- 8. Bump thread last_message_at on insert
CREATE OR REPLACE FUNCTION public.chat_bump_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_threads
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.body, 200)
    WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chat_bump_thread ON public.chat_messages;
CREATE TRIGGER trg_chat_bump_thread AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_bump_thread();

-- 9. RPC: find a user by exact email or phone (only opt-in profiles)
CREATE OR REPLACE FUNCTION public.find_chat_user(_email text DEFAULT NULL, _phone text DEFAULT NULL)
RETURNS TABLE(device_id text, display_name text, rufayq_id text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _hdr_device text;
BEGIN
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  IF _hdr_device IS NULL THEN RETURN; END IF;
  IF COALESCE(NULLIF(trim(_email), ''), NULLIF(trim(_phone), '')) IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.device_id,
         COALESCE(NULLIF(p.full_name_en,''), NULLIF(p.full_name_ar,''), p.rufayq_id) AS display_name,
         p.rufayq_id
  FROM public.profiles p
  WHERE p.deleted_at IS NULL
    AND p.device_id <> _hdr_device
    AND (
      (_email IS NOT NULL AND lower(p.email) = lower(trim(_email)) AND p.discoverable_by_email = true)
      OR (_phone IS NOT NULL AND p.phone = trim(_phone) AND p.discoverable_by_phone = true)
    )
  LIMIT 5;
END $$;

-- 10. RPC: start or fetch a direct (1:1) thread between caller and another patient
CREATE OR REPLACE FUNCTION public.start_direct_chat(_other_device_id text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _hdr_device text;
  _tid uuid;
  _me_name text;
  _other_name text;
BEGIN
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  IF _hdr_device IS NULL THEN RAISE EXCEPTION 'device required'; END IF;
  IF _other_device_id IS NULL OR _other_device_id = _hdr_device THEN
    RAISE EXCEPTION 'invalid recipient';
  END IF;

  -- Existing thread?
  SELECT t.id INTO _tid
  FROM public.chat_threads t
  JOIN public.chat_participants a ON a.thread_id = t.id AND a.device_id = _hdr_device
  JOIN public.chat_participants b ON b.thread_id = t.id AND b.device_id = _other_device_id
  WHERE t.kind = 'direct'
  LIMIT 1;
  IF _tid IS NOT NULL THEN RETURN _tid; END IF;

  SELECT COALESCE(NULLIF(full_name_en,''), NULLIF(full_name_ar,''), rufayq_id) INTO _me_name
  FROM public.profiles WHERE device_id = _hdr_device;
  SELECT COALESCE(NULLIF(full_name_en,''), NULLIF(full_name_ar,''), rufayq_id) INTO _other_name
  FROM public.profiles WHERE device_id = _other_device_id;

  INSERT INTO public.chat_threads(kind, title) VALUES ('direct', NULL) RETURNING id INTO _tid;
  INSERT INTO public.chat_participants(thread_id, device_id, display_name)
  VALUES (_tid, _hdr_device, _me_name), (_tid, _other_device_id, _other_name);
  RETURN _tid;
END $$;

-- 11. RPC: start or fetch a provider thread (requires existing patient<->org link)
CREATE OR REPLACE FUNCTION public.start_provider_chat(_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _hdr_device text;
  _tid uuid;
  _me_name text;
  _org_name text;
BEGIN
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  IF _hdr_device IS NULL THEN RAISE EXCEPTION 'device required'; END IF;
  IF _org_id IS NULL THEN RAISE EXCEPTION 'org required'; END IF;

  -- Must be linked patient
  IF NOT EXISTS (
    SELECT 1 FROM public.provider_patients
    WHERE organization_id = _org_id AND patient_device_id = _hdr_device AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not linked to provider';
  END IF;

  SELECT t.id INTO _tid
  FROM public.chat_threads t
  JOIN public.chat_participants a ON a.thread_id = t.id AND a.device_id = _hdr_device
  JOIN public.chat_participants b ON b.thread_id = t.id AND b.organization_id = _org_id
  WHERE t.kind = 'provider'
  LIMIT 1;
  IF _tid IS NOT NULL THEN RETURN _tid; END IF;

  SELECT COALESCE(NULLIF(full_name_en,''), NULLIF(full_name_ar,''), rufayq_id) INTO _me_name
  FROM public.profiles WHERE device_id = _hdr_device;
  SELECT name INTO _org_name FROM public.organizations WHERE id = _org_id;

  INSERT INTO public.chat_threads(kind, title, organization_id) VALUES ('provider', _org_name, _org_id) RETURNING id INTO _tid;
  INSERT INTO public.chat_participants(thread_id, device_id, display_name) VALUES (_tid, _hdr_device, _me_name);
  INSERT INTO public.chat_participants(thread_id, organization_id, display_name) VALUES (_tid, _org_id, _org_name);
  RETURN _tid;
END $$;

-- 12. RPC: start AI thread (per persona, one per device for tidy history; can repeat with "new")
CREATE OR REPLACE FUNCTION public.start_ai_chat(_persona text, _force_new boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _hdr_device text;
  _tid uuid;
BEGIN
  _hdr_device := NULLIF((current_setting('request.headers', true)::json ->> 'x-device-id'), '');
  IF _hdr_device IS NULL THEN RAISE EXCEPTION 'device required'; END IF;
  IF _persona NOT IN ('medical','shopping','tour') THEN RAISE EXCEPTION 'invalid persona'; END IF;

  INSERT INTO public.chat_threads(kind, title, ai_persona)
  VALUES ('ai',
    CASE _persona WHEN 'medical' THEN 'RufayQ Medical'
                  WHEN 'shopping' THEN 'RufayQ Shopping'
                  ELSE 'RufayQ Tour Guide' END,
    _persona)
  RETURNING id INTO _tid;
  INSERT INTO public.chat_participants(thread_id, device_id, display_name) VALUES (_tid, _hdr_device, 'You');
  RETURN _tid;
END $$;

-- 13. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;