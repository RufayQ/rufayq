-- Profiles (personal)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  full_name_en text,
  full_name_ar text,
  saudi_id text,
  passport_number text,
  date_of_birth date,
  gender text,
  phone text,
  email text,
  nationality text DEFAULT 'Saudi Arabia',
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Medical profile
CREATE TABLE public.medical_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  blood_type text,
  allergies text[],
  chronic_conditions text[],
  current_medications text[],
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  insurance_provider text,
  insurance_policy_number text,
  preferred_language text DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read medical profiles" ON public.medical_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert medical profiles" ON public.medical_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update medical profiles" ON public.medical_profiles FOR UPDATE USING (true);

CREATE TRIGGER update_medical_profiles_updated_at BEFORE UPDATE ON public.medical_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- App reviews
CREATE TABLE public.app_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text,
  reviewer_name text,
  reviewer_country text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes text,
  advice text,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read approved reviews" ON public.app_reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reviews" ON public.app_reviews FOR INSERT WITH CHECK (true);

CREATE INDEX idx_reviews_approved ON public.app_reviews(approved, created_at DESC);