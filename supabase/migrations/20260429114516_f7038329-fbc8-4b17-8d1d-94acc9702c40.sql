-- ============================================================
-- Pricing & Catalog: plans, add-ons, multi-currency prices
-- ============================================================

CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  recommended BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  cta_en TEXT,
  cta_ar TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pricing_plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.pricing_plans(id) ON DELETE CASCADE,
  text_en TEXT NOT NULL,
  text_ar TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pricing_plan_features_plan ON public.pricing_plan_features(plan_id);

CREATE TABLE public.pricing_plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.pricing_plans(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly','quarterly','yearly')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, currency, billing_cycle)
);
CREATE INDEX idx_pricing_plan_prices_lookup ON public.pricing_plan_prices(plan_id, currency, billing_cycle);

CREATE TABLE public.pricing_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  unit_en TEXT,
  unit_ar TEXT,
  cta_en TEXT,
  cta_ar TEXT,
  hero BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pricing_addon_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id UUID NOT NULL REFERENCES public.pricing_addons(id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (addon_id, currency)
);
CREATE INDEX idx_pricing_addon_prices_lookup ON public.pricing_addon_prices(addon_id, currency);

CREATE TABLE public.pricing_catalog_version (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.pricing_catalog_version(id, version) VALUES (1, 1);

-- updated_at triggers
CREATE TRIGGER trg_pricing_plans_updated BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pricing_plan_prices_updated BEFORE UPDATE ON public.pricing_plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pricing_addons_updated BEFORE UPDATE ON public.pricing_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pricing_addon_prices_updated BEFORE UPDATE ON public.pricing_addon_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Catalog version bump + audit
CREATE OR REPLACE FUNCTION public.bump_pricing_catalog_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pricing_catalog_version SET version = version + 1, updated_at = now() WHERE id = 1;
  PERFORM public.log_audit_event(
    'pricing_' || TG_TABLE_NAME || '_' || lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE((NEW).id::text, (OLD).id::text),
    jsonb_build_object('op', TG_OP)
  );
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_bump_v_pricing_plans AFTER INSERT OR UPDATE OR DELETE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.bump_pricing_catalog_version();
CREATE TRIGGER trg_bump_v_pricing_plan_features AFTER INSERT OR UPDATE OR DELETE ON public.pricing_plan_features
  FOR EACH ROW EXECUTE FUNCTION public.bump_pricing_catalog_version();
CREATE TRIGGER trg_bump_v_pricing_plan_prices AFTER INSERT OR UPDATE OR DELETE ON public.pricing_plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.bump_pricing_catalog_version();
CREATE TRIGGER trg_bump_v_pricing_addons AFTER INSERT OR UPDATE OR DELETE ON public.pricing_addons
  FOR EACH ROW EXECUTE FUNCTION public.bump_pricing_catalog_version();
CREATE TRIGGER trg_bump_v_pricing_addon_prices AFTER INSERT OR UPDATE OR DELETE ON public.pricing_addon_prices
  FOR EACH ROW EXECUTE FUNCTION public.bump_pricing_catalog_version();

-- ── RLS ──────────────────────────────────────────────────
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_addon_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_catalog_version ENABLE ROW LEVEL SECURITY;

-- Public read for active rows
CREATE POLICY "Public reads active plans" ON public.pricing_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Mods read all plans" ON public.pricing_plans FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "Admin write plans" ON public.pricing_plans FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Public reads features of active plans" ON public.pricing_plan_features FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.pricing_plans p WHERE p.id = plan_id AND p.is_active = true));
CREATE POLICY "Mods read all features" ON public.pricing_plan_features FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "Admin write features" ON public.pricing_plan_features FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Public reads prices of active plans" ON public.pricing_plan_prices FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.pricing_plans p WHERE p.id = plan_id AND p.is_active = true));
CREATE POLICY "Mods read all plan prices" ON public.pricing_plan_prices FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "Admin write plan prices" ON public.pricing_plan_prices FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Public reads active addons" ON public.pricing_addons FOR SELECT USING (is_active = true);
CREATE POLICY "Mods read all addons" ON public.pricing_addons FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "Admin write addons" ON public.pricing_addons FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Public reads prices of active addons" ON public.pricing_addon_prices FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.pricing_addons a WHERE a.id = addon_id AND a.is_active = true));
CREATE POLICY "Mods read all addon prices" ON public.pricing_addon_prices FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY "Admin write addon prices" ON public.pricing_addon_prices FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Public reads catalog version" ON public.pricing_catalog_version FOR SELECT USING (true);
CREATE POLICY "Admin updates catalog version" ON public.pricing_catalog_version FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ── Seed data ────────────────────────────────────────────
DO $seed$
DECLARE
  p_free UUID; p_starter UUID; p_companion UUID; p_family UUID;
  a_mc UUID; a_rt UUID; a_pc UUID; a_cs UUID; a_pn UUID; a_cc UUID;
BEGIN
  INSERT INTO public.pricing_plans (code, name_en, name_ar, sort_order, recommended, cta_en, cta_ar, published_at) VALUES
    ('FREE','Free','مجاني',0,false,'Start Free','ابدأ مجاناً',now()) RETURNING id INTO p_free;
  INSERT INTO public.pricing_plans (code, name_en, name_ar, sort_order, recommended, cta_en, cta_ar, published_at) VALUES
    ('STARTER','Starter','البداية',1,false,'Subscribe by Bank Transfer','اشترك عبر التحويل البنكي',now()) RETURNING id INTO p_starter;
  INSERT INTO public.pricing_plans (code, name_en, name_ar, sort_order, recommended, cta_en, cta_ar, published_at) VALUES
    ('COMPANION','Companion','الرفيق',2,true,'Subscribe by Bank Transfer','اشترك عبر التحويل البنكي',now()) RETURNING id INTO p_companion;
  INSERT INTO public.pricing_plans (code, name_en, name_ar, sort_order, recommended, cta_en, cta_ar, published_at) VALUES
    ('FAMILY','Family','العائلة',3,false,'Subscribe by Bank Transfer','اشترك عبر التحويل البنكي',now()) RETURNING id INTO p_family;

  -- Plan features (compact set; admin can edit)
  INSERT INTO public.pricing_plan_features (plan_id, text_en, text_ar, sort_order) VALUES
    (p_free,'AI chat: 20 messages / month','محادثة ذكية: ٢٠ رسالة شهرياً',0),
    (p_free,'Documents: 5 files max','المستندات: ٥ ملفات كحد أقصى',1),
    (p_free,'Basic journey tracker','متابعة رحلة أساسية',2),
    (p_starter,'Everything in Free','كل مزايا الباقة المجانية',0),
    (p_starter,'Unlimited AI chat','محادثة ذكية بلا حدود',1),
    (p_starter,'Unlimited documents + OCR','مستندات بلا حدود + قراءة ذكية',2),
    (p_starter,'Medication manager','إدارة الأدوية',3),
    (p_companion,'Everything in Starter','كل مزايا باقة البداية',0),
    (p_companion,'Care Hub recovery','مركز الرعاية للتعافي',1),
    (p_companion,'Priority support','دعم بالأولوية',2),
    (p_family,'Everything in Companion','كل مزايا باقة الرفيق',0),
    (p_family,'Up to 4 family seats','حتى ٤ مقاعد عائلية',1),
    (p_family,'Family timeline sharing','مشاركة الجدول الزمني للعائلة',2);

  -- Plan prices (matches src/data/currencyMaster.ts)
  INSERT INTO public.pricing_plan_prices (plan_id, currency, billing_cycle, amount) VALUES
    (p_starter,'SAR','monthly',49),(p_starter,'SAR','yearly',490),
    (p_starter,'AED','monthly',49),(p_starter,'AED','yearly',490),
    (p_starter,'EGP','monthly',499),(p_starter,'EGP','yearly',4990),
    (p_starter,'USD','monthly',13),(p_starter,'USD','yearly',130),
    (p_starter,'EUR','monthly',12),(p_starter,'EUR','yearly',120),
    (p_companion,'SAR','monthly',119),(p_companion,'SAR','yearly',1190),
    (p_companion,'AED','monthly',119),(p_companion,'AED','yearly',1190),
    (p_companion,'EGP','monthly',1199),(p_companion,'EGP','yearly',11990),
    (p_companion,'USD','monthly',32),(p_companion,'USD','yearly',320),
    (p_companion,'EUR','monthly',29),(p_companion,'EUR','yearly',290),
    (p_family,'SAR','monthly',219),(p_family,'SAR','yearly',2190),
    (p_family,'AED','monthly',219),(p_family,'AED','yearly',2190),
    (p_family,'EGP','monthly',2199),(p_family,'EGP','yearly',21990),
    (p_family,'USD','monthly',59),(p_family,'USD','yearly',590),
    (p_family,'EUR','monthly',55),(p_family,'EUR','yearly',550);

  -- Add-ons
  INSERT INTO public.pricing_addons (key, name_en, name_ar, description_en, description_ar, unit_en, unit_ar, cta_en, cta_ar, hero, sort_order) VALUES
    ('medicalConsultant','RufayQ Medical Consultant','مستشار رُفَيِّق الطبي','45-minute private video consultation with a qualified physician-coordinator.','استشارة فيديو خاصة لمدة ٤٥ دقيقة مع طبيب مؤهل.','/ session','/ جلسة','Book a session','احجز جلسة',true,0)
    RETURNING id INTO a_mc;
  INSERT INTO public.pricing_addons (key, name_en, name_ar, description_en, description_ar, unit_en, unit_ar, cta_en, cta_ar, hero, sort_order) VALUES
    ('rushTranslation','Rush Document Translation','ترجمة مستندات عاجلة','Human-certified Arabic translation under 6-hour turnaround.','ترجمة عربية معتمدة خلال ٦ ساعات.','/ document','/ مستند','Add to plan','أضف للخطة',false,1)
    RETURNING id INTO a_rt;
  INSERT INTO public.pricing_addons (key, name_en, name_ar, description_en, description_ar, unit_en, unit_ar, cta_en, cta_ar, hero, sort_order) VALUES
    ('priorityCoordinator','Priority Travel Coordinator','منسّق سفر بأولوية','Dedicated coordinator for flight, hotel, and transport.','منسّق مخصص للطيران والفندق والمواصلات.','/ trip','/ رحلة','Add to plan','أضف للخطة',false,2)
    RETURNING id INTO a_pc;
  INSERT INTO public.pricing_addons (key, name_en, name_ar, description_en, description_ar, unit_en, unit_ar, cta_en, cta_ar, hero, sort_order) VALUES
    ('caregiverSeat','Extra Caregiver Seat','مقعد مرافق إضافي','Add a family member or nurse to your patient profile.','أضف فرد عائلة أو ممرّض إلى ملفك.','/ seat / month','/ مقعد / شهر','Add seat','أضف مقعداً',false,3)
    RETURNING id INTO a_cs;
  INSERT INTO public.pricing_addons (key, name_en, name_ar, description_en, description_ar, unit_en, unit_ar, cta_en, cta_ar, hero, sort_order) VALUES
    ('physioNetwork','Post-Return Physio Network','شبكة العلاج الطبيعي بعد العودة','Curated KSA physiotherapists at preferential rates.','شبكة مختارة بأسعار تفضيلية.','/ month activation','/ تفعيل شهري','Activate','فعّل',false,4)
    RETURNING id INTO a_pn;
  INSERT INTO public.pricing_addons (key, name_en, name_ar, description_en, description_ar, unit_en, unit_ar, cta_en, cta_ar, hero, sort_order) VALUES
    ('claimsConcierge','Insurance Claims Concierge','مساعد المطالبات التأمينية','AI-prepared, human-reviewed claims to BUPA, Tawuniya, etc.','مطالبات يُعدّها الذكاء الاصطناعي ويراجعها البشر.','10% of recovery (min)','١٠٪ من الاسترداد (حد أدنى)','Start claim','ابدأ مطالبة',false,5)
    RETURNING id INTO a_cc;

  -- Add-on prices (matches src/data/currencyMaster.ts)
  INSERT INTO public.pricing_addon_prices (addon_id, currency, amount) VALUES
    (a_mc,'SAR',94),(a_mc,'AED',94),(a_mc,'EGP',899),(a_mc,'USD',25),(a_mc,'EUR',23),
    (a_rt,'SAR',71),(a_rt,'AED',71),(a_rt,'EGP',699),(a_rt,'USD',19),(a_rt,'EUR',18),
    (a_pc,'SAR',184),(a_pc,'AED',184),(a_pc,'EGP',1799),(a_pc,'USD',49),(a_pc,'EUR',45),
    (a_cs,'SAR',34),(a_cs,'AED',34),(a_cs,'EGP',329),(a_cs,'USD',9),(a_cs,'EUR',8),
    (a_pn,'SAR',56),(a_pn,'AED',56),(a_pn,'EGP',549),(a_pn,'USD',15),(a_pn,'EUR',14),
    (a_cc,'SAR',109),(a_cc,'AED',109),(a_cc,'EGP',1099),(a_cc,'USD',29),(a_cc,'EUR',27);
END $seed$;

-- Realtime for catalog version (so public site refreshes automatically)
ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_catalog_version;
