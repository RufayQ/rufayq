-- Add status / numbering / contract metadata to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS org_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS seq_no BIGSERIAL,
  ADD COLUMN IF NOT EXISTS contract_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_filename TEXT,
  ADD COLUMN IF NOT EXISTS contract_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS city TEXT;

-- Auto-assign org_code on insert (RFQ-ORG-YYYY-NNNN style)
CREATE OR REPLACE FUNCTION public.assign_org_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.org_code IS NULL OR NEW.org_code = '' THEN
    NEW.org_code := 'ORG-' || to_char(now() AT TIME ZONE 'UTC','YYYY') || '-' || LPAD(NEW.seq_no::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_org_code ON public.organizations;
CREATE TRIGGER trg_assign_org_code BEFORE INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.assign_org_code();

-- Backfill existing rows
UPDATE public.organizations SET org_code = 'ORG-' || to_char(created_at,'YYYY') || '-' || LPAD(seq_no::text, 5, '0')
WHERE org_code IS NULL;

-- Organization subscription packages assigned by admins
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  seats INT NOT NULL DEFAULT 5,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  notes TEXT,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage org subscriptions" ON public.organization_subscriptions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Org members view their subscriptions" ON public.organization_subscriptions
  FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER trg_org_sub_updated BEFORE UPDATE ON public.organization_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for contracts
INSERT INTO storage.buckets (id, name, public) VALUES ('org-contracts', 'org-contracts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins manage org contracts" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'org-contracts' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'org-contracts' AND public.has_role(auth.uid(),'admin'));