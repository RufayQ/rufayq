-- Trial tracking table (device-scoped, no auth required)
CREATE TABLE public.user_trials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  trial_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '14 days'),
  plan TEXT NOT NULL DEFAULT 'trial',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;

-- Permissive policies (device-scoped, no auth in this app)
CREATE POLICY "Anyone can read trials"
ON public.user_trials FOR SELECT
USING (true);

CREATE POLICY "Anyone can create trials"
ON public.user_trials FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update trials"
ON public.user_trials FOR UPDATE
USING (true);

CREATE INDEX idx_user_trials_device_id ON public.user_trials(device_id);