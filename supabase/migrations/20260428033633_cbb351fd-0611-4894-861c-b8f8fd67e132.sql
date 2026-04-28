
-- 1) Payment proof fields on organization_subscriptions
ALTER TABLE public.organization_subscriptions
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_receipt_url text,
  ADD COLUMN IF NOT EXISTS payment_receipt_filename text,
  ADD COLUMN IF NOT EXISTS payment_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) Storage bucket for organization payment receipts (private)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('org-payments', 'org-payments', false)
  ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins manage org-payments') THEN
    CREATE POLICY "Admins manage org-payments" ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'org-payments' AND public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (bucket_id = 'org-payments' AND public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END$$;

-- 3) Organization invites table (email-based) with org-scoped roles + audit
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_role text NOT NULL DEFAULT 'org_viewer'
    CHECK (invited_role IN ('org_admin','org_manager','org_agent','org_viewer')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invites(email);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organization_invites' AND policyname='Admins manage invites') THEN
    CREATE POLICY "Admins manage invites" ON public.organization_invites
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organization_invites' AND policyname='Org members view their invites') THEN
    CREATE POLICY "Org members view their invites" ON public.organization_invites
      FOR SELECT TO authenticated
      USING (public.is_org_member(auth.uid(), organization_id));
  END IF;
END$$;
