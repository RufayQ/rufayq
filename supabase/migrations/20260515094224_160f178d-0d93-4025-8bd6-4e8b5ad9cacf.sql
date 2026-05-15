CREATE TABLE public.flight_drafts (
  id TEXT NOT NULL,
  user_id UUID NOT NULL,
  label TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE public.flight_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own flight drafts"
  ON public.flight_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own flight drafts"
  ON public.flight_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own flight drafts"
  ON public.flight_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own flight drafts"
  ON public.flight_drafts FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_flight_draft_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_flight_drafts_touch
  BEFORE UPDATE ON public.flight_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_flight_draft_updated_at();

CREATE INDEX idx_flight_drafts_user_updated ON public.flight_drafts (user_id, updated_at DESC);