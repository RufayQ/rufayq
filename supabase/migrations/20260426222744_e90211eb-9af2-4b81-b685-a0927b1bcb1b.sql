
-- ============================================================
-- Website CMS — Phase 1 foundation
-- ============================================================

-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.cms_page_status AS ENUM ('draft','published','scheduled','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cms_section_type AS ENUM (
    'hero','features','how','pricing','faq','cta','rich_text',
    'testimonials','trust_logos','providers','contact_form',
    'comparison','timeline','video','stats','text_image','footer_cta','team'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cms_nav_link_type AS ENUM ('page','anchor','external');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- cms_pages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,
  title_en     TEXT NOT NULL,
  title_ar     TEXT,
  status       cms_page_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  -- SEO
  seo_title_en TEXT,
  seo_title_ar TEXT,
  seo_desc_en  TEXT,
  seo_desc_ar  TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  index_in_search BOOLEAN NOT NULL DEFAULT true,
  include_sitemap BOOLEAN NOT NULL DEFAULT true,
  -- meta
  is_system    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID
);

CREATE INDEX IF NOT EXISTS cms_pages_slug_idx ON public.cms_pages(slug);
CREATE INDEX IF NOT EXISTS cms_pages_status_idx ON public.cms_pages(status);

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published pages" ON public.cms_pages;
CREATE POLICY "Public can read published pages"
  ON public.cms_pages FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Staff can read all pages" ON public.cms_pages;
CREATE POLICY "Staff can read all pages"
  ON public.cms_pages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "Admins manage pages" ON public.cms_pages;
CREATE POLICY "Admins manage pages"
  ON public.cms_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- cms_sections
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  type        cms_section_type NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  visible     BOOLEAN NOT NULL DEFAULT true,
  scheduled_at TIMESTAMPTZ,
  -- locale-keyed JSON content. Shape depends on `type`. EN required, AR optional.
  content_en  JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_ar  JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- shared (locale-agnostic) like image URLs, colors, links, icons
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID
);

CREATE INDEX IF NOT EXISTS cms_sections_page_idx ON public.cms_sections(page_id, sort_order);

ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read visible sections of published pages" ON public.cms_sections;
CREATE POLICY "Public can read visible sections of published pages"
  ON public.cms_sections FOR SELECT TO anon, authenticated
  USING (
    visible = true
    AND EXISTS (SELECT 1 FROM public.cms_pages p WHERE p.id = page_id AND p.status = 'published')
  );

DROP POLICY IF EXISTS "Staff can read all sections" ON public.cms_sections;
CREATE POLICY "Staff can read all sections"
  ON public.cms_sections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "Admins manage sections" ON public.cms_sections;
CREATE POLICY "Admins manage sections"
  ON public.cms_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- cms_nav_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_nav_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location   TEXT NOT NULL DEFAULT 'header',  -- header | footer
  label_en   TEXT NOT NULL,
  label_ar   TEXT,
  link_type  cms_nav_link_type NOT NULL DEFAULT 'anchor',
  link_value TEXT NOT NULL,                   -- /pricing, #features, https://…
  sort_order INT NOT NULL DEFAULT 0,
  visible    BOOLEAN NOT NULL DEFAULT true,
  parent_id  UUID REFERENCES public.cms_nav_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cms_nav_loc_idx ON public.cms_nav_items(location, sort_order);

ALTER TABLE public.cms_nav_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads visible nav" ON public.cms_nav_items;
CREATE POLICY "Public reads visible nav"
  ON public.cms_nav_items FOR SELECT TO anon, authenticated
  USING (visible = true);

DROP POLICY IF EXISTS "Staff read all nav" ON public.cms_nav_items;
CREATE POLICY "Staff read all nav"
  ON public.cms_nav_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "Admins manage nav" ON public.cms_nav_items;
CREATE POLICY "Admins manage nav"
  ON public.cms_nav_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- cms_footer_items (columns + links)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_footer_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_key  TEXT NOT NULL,        -- company | resources | legal | support | social
  label_en    TEXT NOT NULL,
  label_ar    TEXT,
  link_type   cms_nav_link_type NOT NULL DEFAULT 'page',
  link_value  TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  visible     BOOLEAN NOT NULL DEFAULT true,
  is_header   BOOLEAN NOT NULL DEFAULT false,  -- true = column heading
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cms_footer_col_idx ON public.cms_footer_items(column_key, sort_order);

ALTER TABLE public.cms_footer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads visible footer" ON public.cms_footer_items;
CREATE POLICY "Public reads visible footer"
  ON public.cms_footer_items FOR SELECT TO anon, authenticated
  USING (visible = true);

DROP POLICY IF EXISTS "Staff read all footer" ON public.cms_footer_items;
CREATE POLICY "Staff read all footer"
  ON public.cms_footer_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "Admins manage footer" ON public.cms_footer_items;
CREATE POLICY "Admins manage footer"
  ON public.cms_footer_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- cms_global_settings (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_global_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name      TEXT NOT NULL DEFAULT 'RufayQ',
  brand_name_ar   TEXT NOT NULL DEFAULT 'رُفَيِّق',
  tagline_en      TEXT,
  tagline_ar      TEXT,
  primary_color   TEXT NOT NULL DEFAULT '#004D5B',
  secondary_color TEXT NOT NULL DEFAULT '#006D7C',
  accent_color    TEXT NOT NULL DEFAULT '#00929F',
  gold_color      TEXT NOT NULL DEFAULT '#C5965A',
  navy_color      TEXT NOT NULL DEFAULT '#0D1B2A',
  support_email   TEXT,
  support_whatsapp TEXT,
  sales_email     TEXT,
  default_language TEXT NOT NULL DEFAULT 'en',
  language_toggle BOOLEAN NOT NULL DEFAULT true,
  sticky_header   BOOLEAN NOT NULL DEFAULT true,
  newsletter_title_en TEXT,
  newsletter_title_ar TEXT,
  newsletter_subtitle_en TEXT,
  newsletter_subtitle_ar TEXT,
  copyright_en    TEXT,
  copyright_ar    TEXT,
  social_links    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID,
  is_singleton    BOOLEAN NOT NULL DEFAULT true UNIQUE
);

ALTER TABLE public.cms_global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads global settings" ON public.cms_global_settings;
CREATE POLICY "Public reads global settings"
  ON public.cms_global_settings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage global settings" ON public.cms_global_settings;
CREATE POLICY "Admins manage global settings"
  ON public.cms_global_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed singleton row
INSERT INTO public.cms_global_settings (
  brand_name, brand_name_ar, tagline_en, tagline_ar,
  support_email, support_whatsapp, sales_email,
  newsletter_title_en, newsletter_title_ar,
  newsletter_subtitle_en, newsletter_subtitle_ar,
  copyright_en, copyright_ar
)
SELECT 'RufayQ','رُفَيِّق',
  'Your AI Medical Buddy, Every Step Abroad',
  'رفيقك الطبي الذكي في كل رحلة علاج',
  'support@rufayq.com','+966500000000','sales@rufayq.com',
  'Get medical travel tips','نصائح للسفر الطبي',
  'Subscribe to our newsletter for the latest updates.',
  'اشترك في نشرتنا للحصول على آخر التحديثات.',
  '© 2026 RufayQ. All rights reserved.',
  '© 2026 رُفَيِّق. جميع الحقوق محفوظة.'
WHERE NOT EXISTS (SELECT 1 FROM public.cms_global_settings);

-- ============================================================
-- cms_versions (audit / rollback snapshot)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cms_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,           -- 'page' | 'section' | 'nav' | 'footer' | 'global'
  entity_id   UUID,
  snapshot    JSONB NOT NULL,
  actor_id    UUID,
  action      TEXT NOT NULL,           -- 'created' | 'updated' | 'published' | 'archived'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cms_versions_entity_idx ON public.cms_versions(entity_type, entity_id, created_at DESC);

ALTER TABLE public.cms_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read versions" ON public.cms_versions;
CREATE POLICY "Staff read versions"
  ON public.cms_versions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "Admins write versions" ON public.cms_versions;
CREATE POLICY "Admins write versions"
  ON public.cms_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS trg_cms_pages_updated ON public.cms_pages;
CREATE TRIGGER trg_cms_pages_updated BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cms_sections_updated ON public.cms_sections;
CREATE TRIGGER trg_cms_sections_updated BEFORE UPDATE ON public.cms_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cms_nav_updated ON public.cms_nav_items;
CREATE TRIGGER trg_cms_nav_updated BEFORE UPDATE ON public.cms_nav_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cms_footer_updated ON public.cms_footer_items;
CREATE TRIGGER trg_cms_footer_updated BEFORE UPDATE ON public.cms_footer_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cms_global_updated ON public.cms_global_settings;
CREATE TRIGGER trg_cms_global_updated BEFORE UPDATE ON public.cms_global_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Audit + version snapshot trigger (page + section)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cms_log_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _action TEXT; _etype TEXT; _eid UUID; _snap JSONB;
BEGIN
  _etype := TG_ARGV[0];
  IF TG_OP = 'INSERT' THEN _action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'updated';
    IF _etype = 'page' AND NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'published' THEN _action := 'published';
      ELSIF NEW.status = 'archived' THEN _action := 'archived';
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN _action := 'deleted';
  END IF;
  _eid  := COALESCE((NEW).id, (OLD).id);
  _snap := to_jsonb(COALESCE(NEW, OLD));
  INSERT INTO public.cms_versions(entity_type, entity_id, snapshot, actor_id, action)
  VALUES (_etype, _eid, _snap, auth.uid(), _action);
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_cms_pages_version ON public.cms_pages;
CREATE TRIGGER trg_cms_pages_version
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.cms_log_version('page');

DROP TRIGGER IF EXISTS trg_cms_sections_version ON public.cms_sections;
CREATE TRIGGER trg_cms_sections_version
  AFTER INSERT OR UPDATE OR DELETE ON public.cms_sections
  FOR EACH ROW EXECUTE FUNCTION public.cms_log_version('section');
