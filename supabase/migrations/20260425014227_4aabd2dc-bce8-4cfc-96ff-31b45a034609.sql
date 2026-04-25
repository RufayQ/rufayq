
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  usage_day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count INTEGER NOT NULL DEFAULT 0,
  last_prompt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, usage_day)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_device_day ON public.ai_usage(device_id, usage_day);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all ai_usage"
  ON public.ai_usage FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_ai_usage_updated_at
  BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
