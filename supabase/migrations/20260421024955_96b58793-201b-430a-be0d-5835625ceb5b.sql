-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('free','starter','companion','family','enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('trial','active','past_due','canceled','expired','pending_setup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_cycle AS ENUM ('monthly','annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.addon_id AS ENUM (
    'medicalConsultant','rushTranslation','priorityCoordinator',
    'caregiverSeat','physioNetwork','claimsConcierge'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.addon_status AS ENUM ('pending_admin','active','canceled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ SUBSCRIPTIONS ============
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                    -- auth.users.id of organizer / owner
  device_id text,                            -- legacy bridge (auth_<uuid>)
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  currency text NOT NULL DEFAULT 'SAR',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  trial_ends_at timestamptz,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  canceled_at timestamptz,
  -- Family
  family_seat_capacity int NOT NULL DEFAULT 0,    -- 4 for Family plan
  family_setup_completed boolean NOT NULL DEFAULT false,
  -- Bookkeeping
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User views own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User upserts own subscription" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "User updates own subscription" ON public.subscriptions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manage all subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan);

-- ============ FAMILY MEMBERS ============
CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL,               -- auth.users.id (denorm for RLS)
  -- Identity
  full_name text NOT NULL,
  full_name_ar text,
  relationship text NOT NULL,               -- spouse, child, parent, sibling, other
  date_of_birth date,
  gender text,
  phone text,
  email text,
  national_id text,
  passport_number text,
  nationality text,
  -- Medical (organizer-filled per chosen flow)
  blood_type text,
  chronic_conditions text[],
  allergies text[],
  current_medications text[],
  surgical_history text,
  family_history text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  notes text,
  -- Linkage
  member_device_id text,                    -- set once member signs up & is linked
  status text NOT NULL DEFAULT 'active',   -- active, pending_link, removed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer manages own family members" ON public.family_members
  FOR ALL TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "Member reads own record by device" ON public.family_members
  FOR SELECT TO public
  USING (member_device_id IS NOT NULL
         AND member_device_id = ((current_setting('request.headers', true))::json ->> 'x-device-id'));
CREATE POLICY "Admin manage all family members" ON public.family_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_family_members_sub ON public.family_members(subscription_id);

-- ============ FAMILY INVITES (optional, for later self-link) ============
CREATE TABLE IF NOT EXISTS public.family_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL,
  invite_phone text,
  invite_email text,
  invite_code text NOT NULL DEFAULT substr(replace(gen_random_uuid()::text,'-',''),1,8),
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, revoked, expired
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_device_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer manages own invites" ON public.family_invites
  FOR ALL TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());
CREATE POLICY "Admin manage all invites" ON public.family_invites
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_family_invites_code ON public.family_invites(invite_code);

-- ============ SUBSCRIPTION ADD-ONS ============
CREATE TABLE IF NOT EXISTS public.subscription_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  addon public.addon_id NOT NULL,
  status public.addon_status NOT NULL DEFAULT 'pending_admin',
  qty int NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  admin_notes text,
  user_notes text,
  activated_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User manages own addons" ON public.subscription_addons
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manage all addons" ON public.subscription_addons
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_addons_status ON public.subscription_addons(status);
CREATE INDEX IF NOT EXISTS idx_addons_sub ON public.subscription_addons(subscription_id);

-- ============ BILLING EVENTS ============
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL, -- created, upgraded, downgraded, renewed, canceled, addon_added, addon_removed, family_setup, payment_succeeded, payment_failed
  amount numeric(12,2),
  currency text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User views own billing events" ON public.billing_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User inserts own billing events" ON public.billing_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manage all billing events" ON public.billing_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_billing_events_sub ON public.billing_events(subscription_id, created_at DESC);

-- ============ updated_at triggers ============
CREATE TRIGGER trg_subscriptions_updated
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_family_members_updated
BEFORE UPDATE ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_subscription_addons_updated
BEFORE UPDATE ON public.subscription_addons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
