
CREATE TABLE IF NOT EXISTS public.user_subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
  addon_key TEXT NOT NULL,
  addon_label TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'SAR',
  active_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_subscription_addons_sub ON public.user_subscription_addons(subscription_id);

ALTER TABLE public.user_subscription_addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage all user addons" ON public.user_subscription_addons;
CREATE POLICY "Admins manage all user addons" ON public.user_subscription_addons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Moderators read all user addons" ON public.user_subscription_addons;
CREATE POLICY "Moderators read all user addons" ON public.user_subscription_addons FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'moderator'));

DROP TRIGGER IF EXISTS set_user_subscription_addons_updated_at ON public.user_subscription_addons;
CREATE TRIGGER set_user_subscription_addons_updated_at BEFORE UPDATE ON public.user_subscription_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
