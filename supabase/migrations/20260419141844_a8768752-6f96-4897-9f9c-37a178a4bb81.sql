-- 1. Bilingual site pages
ALTER TABLE public.site_pages
  ADD COLUMN IF NOT EXISTS body_md_ar text NOT NULL DEFAULT '';

INSERT INTO public.site_pages (slug, title, body_md, body_md_ar)
VALUES ('security', 'Security & Compliance', '', '')
ON CONFLICT (slug) DO NOTHING;

-- 2. Provider applications
CREATE TABLE IF NOT EXISTS public.provider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected|needs_info
  org_name text NOT NULL,
  org_name_ar text,
  org_type public.org_type NOT NULL DEFAULT 'other',
  country text,
  contact_email text NOT NULL,
  contact_phone text,
  website text,
  contact_person_name text NOT NULL,
  contact_person_role text,
  notes text,
  agreement_url text,
  registration_url text,
  admin_feedback text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL
);

ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;

-- Public can submit
CREATE POLICY "Anyone submits provider application"
ON public.provider_applications FOR INSERT
TO public
WITH CHECK (status = 'pending');

-- Staff can read
CREATE POLICY "Staff view provider applications"
ON public.provider_applications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- Admins manage
CREATE POLICY "Admins update provider applications"
ON public.provider_applications FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete provider applications"
ON public.provider_applications FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_provider_apps_updated_at ON public.provider_applications;
CREATE TRIGGER trg_provider_apps_updated_at
BEFORE UPDATE ON public.provider_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Storage bucket for provider docs (public read so admins can preview easily)
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-docs', 'provider-docs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read provider docs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'provider-docs');

CREATE POLICY "Anyone upload provider docs to applications/"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'provider-docs' AND (storage.foldername(name))[1] = 'applications');

CREATE POLICY "Admins delete provider docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'provider-docs' AND public.has_role(auth.uid(),'admin'));