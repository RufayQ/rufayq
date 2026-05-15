-- One-time backfill of missing phone/email on auth_<uid> profiles, sourced
-- from auth.users (which holds the verified OTP recipient). Synthetic
-- @phone.rufayq.local emails are login aliases, not patient contacts, so
-- they are explicitly excluded.
UPDATE public.profiles p
SET
  phone = COALESCE(
    p.phone,
    CASE
      WHEN u.phone IS NOT NULL AND u.phone <> '' THEN
        CASE WHEN u.phone LIKE '+%' THEN u.phone ELSE '+' || u.phone END
      ELSE NULL
    END
  ),
  email = COALESCE(
    p.email,
    CASE
      WHEN u.email IS NOT NULL
       AND u.email NOT LIKE '%@phone.rufayq.local'
      THEN u.email
      ELSE NULL
    END
  ),
  updated_at = now()
FROM auth.users u
WHERE p.device_id = 'auth_' || u.id::text
  AND (p.phone IS NULL OR p.email IS NULL);