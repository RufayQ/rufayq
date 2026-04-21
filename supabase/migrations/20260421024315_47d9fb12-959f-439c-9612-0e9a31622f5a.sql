-- One-time fix: align test patient credentials with phone-based sign-in scheme.
-- Phone +966569590418 → synthetic email 966569590418@phone.rufayq.local
DO $$
BEGIN
  UPDATE auth.users
     SET email = '966569590418@phone.rufayq.local',
         encrypted_password = crypt('RufayQ@2026', gen_salt('bf')),
         email_confirmed_at = COALESCE(email_confirmed_at, now()),
         updated_at = now()
   WHERE id = '8ef2e1b9-6c8d-48d1-a6aa-8f5d618f9fb5';

  UPDATE public.profiles
     SET email = '966569590418@phone.rufayq.local',
         updated_at = now()
   WHERE device_id = 'auth_8ef2e1b9-6c8d-48d1-a6aa-8f5d618f9fb5';
END $$;