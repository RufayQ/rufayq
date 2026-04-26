
-- 1. Expand status + plan check constraints on user_subscriptions
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_check;
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_plan_check
  CHECK (plan = ANY (ARRAY[
    'FREE','STARTER','COMPANION','FAMILY',
    'trial','basic','companion','family','premium','starter','free'
  ]));

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_status_check
  CHECK (status = ANY (ARRAY[
    'pending_receipt','active','trial','past_due','suspended',
    'pending_cancel','cancelled','expired','rejected'
  ]));

-- 2. RufayQ unique ID on profiles (RFQ-YYYY-XXXXXX)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rufayq_id text;

CREATE OR REPLACE FUNCTION public.assign_rufayq_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE _candidate text; _attempt int := 0;
BEGIN
  IF NEW.rufayq_id IS NOT NULL AND NEW.rufayq_id <> '' THEN
    RETURN NEW;
  END IF;
  LOOP
    _candidate := 'RFQ-' || to_char(now() AT TIME ZONE 'UTC','YYYY') || '-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text || NEW.device_id) for 6));
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE rufayq_id = _candidate) THEN
      NEW.rufayq_id := _candidate;
      RETURN NEW;
    END IF;
    _attempt := _attempt + 1;
    IF _attempt > 10 THEN
      NEW.rufayq_id := 'RFQ-' || to_char(now() AT TIME ZONE 'UTC','YYYY') || '-' ||
        upper(substring(md5(gen_random_uuid()::text) for 6));
      RETURN NEW;
    END IF;
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_assign_rufayq_id ON public.profiles;
CREATE TRIGGER trg_assign_rufayq_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_rufayq_id();

-- backfill existing rows
UPDATE public.profiles
   SET rufayq_id = 'RFQ-' || to_char(COALESCE(created_at, now()) AT TIME ZONE 'UTC','YYYY') || '-' ||
                   upper(substring(md5(id::text) for 6))
 WHERE rufayq_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_rufayq_id ON public.profiles(rufayq_id);
