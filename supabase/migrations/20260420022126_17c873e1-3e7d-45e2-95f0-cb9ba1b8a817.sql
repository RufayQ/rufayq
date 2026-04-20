-- Add structured medical history columns to medical_profiles
ALTER TABLE public.medical_profiles
  ADD COLUMN IF NOT EXISTS past_medical_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS family_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS surgical_history jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.medical_profiles.past_medical_history IS 'Array of {condition, year, notes, status}';
COMMENT ON COLUMN public.medical_profiles.family_history IS 'Array of {relation, condition, age_of_onset, notes}';
COMMENT ON COLUMN public.medical_profiles.surgical_history IS 'Array of {procedure, year, hospital, notes}';