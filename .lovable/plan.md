# Connect Google account from Profile

The PhoneInput country selector + auto-detect with manual override is already shipped. Google sign-in already syncs `google_email`, `google_sub`, `google_linked_at`, and the `auth_providers` array onto the user's profile via `syncGoogleLinkage` on every auth event. What's missing is a UI for an already-signed-in user (e.g. someone who registered with phone+password) to attach a Google account to their existing profile, see the linked email, and unlink it.

## Validate and implement Google account linking from Profile, but do not assume existing Google linkage columns or helpers unless the branch proves them.

Branch reality checks first:

1. Run:

   rg -n "syncGoogleLinkage|google_email|google_sub|google_linked_at|auth_providers|linkIdentity|getUserIdentities|unlinkIdentity" src supabase

   rg --files src/lib | rg "google|auth"

   nl -ba src/integrations/supabase/types.ts | sed -n '2575,2645p'

   nl -ba src/components/AppAuthGuard.tsx | sed -n '1,110p'

   nl -ba src/pages/Index.tsx | sed -n '300,335p'

2. If google_email/google_sub/google_linked_at/auth_providers are absent from types and migrations, do not claim “no DB migration needed.”

Implementation constraints:

- No schema changes unless you include a migration and generated type updates.

- Prefer deriving linked Google state from Supabase Auth identities via getUserIdentities().

- Do not depend on nonexistent syncGoogleLinkage/googleLink.ts.

- Do not redirect to /profile unless you add a real route.

- Use an existing route such as /app or /ar/app, optionally with a query param that opens Profile after return.

Build:

1. New hook: src/hooks/useLinkedProviders.ts

   - Reads supabase.auth.getUser()

   - Reads supabase.auth.getUserIdentities()

   - Derives:

     google.linked

     [google.email](http://google.email) from identity.identity_data?.email or user email fallback

     google.identity

   - Subscribes to onAuthStateChange and refreshes after SIGNED_IN, USER_UPDATED, TOKEN_REFRESHED.

   - Does not require profile google_* columns.

2. New component: src/components/profile/ConnectedAccountsCard.tsx

   - Renders Google row:

     - Not linked: Connect button

     - Linking: spinner/loading label

     - Linked: email + linked badge + unlink button

   - Link action:

     supabase.auth.linkIdentity({

       provider: "google",

       options: {

         redirectTo: `${window.location.origin}/app?profile=1`

       }

     })

   - Use /ar/app?profile=1 if the current location starts with /ar.

   - Surface bilingual errors with sonner toasts.

   - Handle identity_already_exists with a specific bilingual message.

   - Confirm whether Supabase manual identity linking is enabled; if disabled, show a clear setup error.

3. Profile return:

   - In src/pages/Index.tsx, if URL has ?profile=1 and user is authenticated, open ProfileScreen once and then remove/ignore the query param.

   - Keep this minimal.

4. Unlink:

   - Call getUserIdentities().

   - Find identity.provider === "google".

   - Block unlink if identities.length <= 1 with bilingual toast:

     "Add another sign-in method before unlinking Google."

   - Call unlinkIdentity(googleIdentity).

   - Refresh hook state after success.

   - Do not attempt profile google_* updates unless a schema migration is added.

5. ProfileScreen:

   - Add ConnectedAccountsCard above Legal in registered-user view.

   - Keep guest-mode profile unchanged.

6. Tests:

   - Add tests for useLinkedProviders or ConnectedAccountsCard with mocked supabase.auth methods:

     - not linked

     - linked

     - link action calls linkIdentity with google

     - unlink blocked if only identity

     - unlink calls unlinkIdentity if multiple identities

   - Update any ProfileScreen test if present.

Verification:

- npx tsc -p [tsconfig.app](http://tsconfig.app).json --noEmit

- bunx vitest run

- bun run build

Manual:

- Phone/password user → Profile → Link Google → Google flow → return to /app?profile=1 → Profile opens → Google row linked.

- Linked user → Unlink → confirm → row returns to not linked.

- Attempt unlink as only identity → blocked.

If product wants profile-side columns anyway

If the team specifically wants the profile table to store Google linkage fields, then the plan must include a schema step:

sql

alter table public.profiles

  add column if not exists google_email text,

  add column if not exists google_sub text,

  add column if not exists google_linked_at timestamptz,

  add column if not exists auth_providers text[] not null default '{}';

Then regenerate/update src/integrations/supabase/types.ts.

But I would still derive canonical identity state from Supabase Auth identities and treat profile columns as a cached display/sync field.

Final recommendation

Approve the feature direction, not the implementation plan as written.

The key changes I’d require before Lovable implements:

Do not claim existing Google profile columns unless migrations/types prove it.

Do not depend on nonexistent syncGoogleLinkage / googleLink.ts.

Do not redirect to /profile; use /app?profile=1 or add a real route.

Use getUserIdentities() as the source of truth for link/unlink state.

Block unlink based on actual identity count.

Add tests for connected-account state and link/unlink behavior.

Commands I used to validate

rg -n "syncGoogleLinkage|google_email|google_sub|auth_providers|linkIdentity|getUserIdentities|unlinkIdentity|ProfileScreen|SettingRow|profile" src supabase -g '*.{ts,tsx,js}' | head -240

rg --files src/lib src/hooks src | rg 'google|auth'

rg -n "syncGoogleLinkage|google_email|google_sub|google_linked_at|auth_providers|provider_identities|identities|linkIdentity|unlinkIdentity|signInWithOAuth|onAuthStateChange" src supabase -g '*.{ts,tsx,js}'

nl -ba src/integrations/supabase/types.ts | sed -n '2575,2645p'

rg -n "create table.*profiles|alter table.*profiles|google|auth_providers" supabase/migrations -i

rg --files src/lib | sort

nl -ba src/screens/ProfileScreen.tsx | sed -n '1,120p;360,410p'

nl -ba src/components/AppAuthGuard.tsx | sed -n '1,95p'

nl -ba src/pages/Index.tsx | sed -n '300,335p'