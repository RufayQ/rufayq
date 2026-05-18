Issue

Users who signed in with Google have `profiles.google_email` set but `profiles.email` is `NULL`. The Chat Discovery feature reads only `profiles.email`, so:

- The Settings toggle shows "Add an email to your profile first" and refuses to turn on.
- Even if it were on, `find_chat_user` matches on `p.email` only, so nobody could find them.

Confirmed in the database: Google users have `email = null`, `google_email = <gmail>`, `auth_providers = ['google']`.

Fix

1. Persist email at Google sign-in
   - In `src/lib/auth/googleLink.ts`, when upserting the Google-linked profile, also write `email` using the Google identity email (or the Supabase session email) when the profile currently has none. Do not overwrite an existing custom email.

2. Treat `google_email` as a valid discovery email
   - Update the SECURITY DEFINER function `public.get_chat_discovery` so the returned `email` is `COALESCE(p.email, p.google_email)`. This makes the Settings screen show the Gmail address and let the user enable the toggle.
   - Update `public.find_chat_user` so the email match is `lower(COALESCE(p.email, p.google_email)) = lower(trim(_email))`, gated by `discoverable_by_email = true`. This makes Google users actually discoverable.

3. Backfill existing rows
   - One-time migration: `UPDATE public.profiles SET email = google_email WHERE email IS NULL AND google_email IS NOT NULL;` so users who signed in before this fix become discoverable without needing to re-link.

4. Validation
   - After deploy, re-check via the discovery RPC that a Google-only profile reports an email and accepts the toggle.
   - Search for the same Gmail from another device and confirm the user appears in results.

Technical notes

- All schema/function changes go through a single migration.
- No client UI changes beyond the `googleLink.ts` upsert tweak; the Settings screen already renders the discoverable email when present.
- RLS stays unchanged; both RPCs remain SECURITY DEFINER and continue to scope by the `x-device-id` header.