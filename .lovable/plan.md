## Goal

1. Confirm every landing-page CTA and header button routes to the correct destination:

   - public signup/sign-in CTAs go to `/auth`

   - they must never route unauthenticated visitors to `/admin`

   - they should not jump directly to raw `/app` unless the user is already authenticated or in guest mode

2. Add a soft auth guard on `/app`:

   - unauthenticated, non-guest visitors get redirected to `/auth?returnTo=/app...`

   - `/app?signin=1` still renders the inline traveler sign-in flow

   - guest mode still works

3. Update `/auth` account chooser:

   - rename **Patient** to **Traveler**

   - clicking Traveler must start a clean traveler/patient sign-in flow

   - clicking Traveler must not accidentally reuse stale doctor/provider/admin role state

   - clicking Traveler must not force the user to `/admin`

## Current code context

- `/app` and `/ar/app` currently render `Index`.

- `/auth` renders the account chooser.

- `/auth` currently has a card labeled `Patient` that navigates to `/app?signin=1`.

- `Index.tsx` has a staff auto-redirect that sends signed-in `admin` or `moderator` users from `/app` to `/admin`.

- Role preference is stored in localStorage as `rufayq_role` with a role version key.

- Existing role selector uses `"patient"` and `"doctor"` internally.

- For product copy, the user-facing label should be **Traveler**, but the internal role value can remain `"patient"` to avoid a larger auth refactor.

## Audit results

| Location | Element | Current target / behavior | Verdict |

|---|---|---|---|

| `src/pages/Landing.tsx` | Header Sign In | `/auth` | OK |

| `src/pages/Landing.tsx` | Mobile Sign In | `/auth` | OK |

| `src/pages/Landing.tsx` | Hero Start Free | `/auth` | OK |

| `src/pages/LandingBelow.tsx` | Bottom Open RufayQ | `/app` via `goToApp` | Change to `/auth` for unauthenticated public CTA |

| `src/pages/Auth.tsx` | Patient card | `/app?signin=1` | Change label to Traveler and make click set patient/traveler role cleanly |

| `src/pages/Index.tsx` | Staff auto redirect | signed-in admin/moderator on `/app` → `/admin` | Keep, but do not let Traveler sign-in path accidentally trigger it before sign-in |

## Changes

### 1. `src/pages/Auth.tsx` — rename Patient to Traveler

Change the account chooser user-facing copy:

- `Patient` → `Traveler`

- Arabic suggestion:

  - `مسافر علاجي`

  - or shorter: `مسافر`

- `Open patient app` → `Open traveler app`

- Description should be traveler-oriented:

  - “Track your medical travel journey, records, medications, appointments and chat with RufayQ AI.”

Important:

- Keep the internal role value as `"patient"` for now.

- Do not rename the internal role to `"traveler"` unless doing a separate auth/schema migration.

- This should be a copy/UI change only.

### 2. `src/pages/Auth.tsx` — make Traveler click set a clean patient role

Before navigating to `/app?signin=1`, explicitly store the patient/traveler role preference.

The goal is to prevent stale localStorage like `rufayq_role=doctor` from being reused after the user clicks Traveler.

Use the same storage contract as `RoleSelectorScreen`:

- `rufayq_role = "patient"`

- matching role version key

Preferred implementation:

- Export a helper from `RoleSelectorScreen`, for example:

```ts

export function setStoredRole(role: AppRolePref) {

  localStorage.setItem(ROLE_PREF_KEY, role);

  localStorage.setItem(ROLE_VERSION_KEY, String(ROLE_PREF_VERSION));

}

Then in Auth.tsx:

ts

setStoredRole("patient");

navigate`/app?signin=1${returnTo ?` &returnTo=${encodeURIComponent(returnTo) `: ""}`);

If exporting a helper is too much, duplicate the exact keys carefully, but helper is preferred to avoid drift.

3. src/pages/Auth.tsx — avoid existing staff session causing immediate /admin

Before navigating from the Traveler card, check whether a session already exists.

If there is an existing Supabase session and the user explicitly chooses Traveler from /auth, do one of these:

Preferred simple behavior:

Sign out the existing session before navigating to /app?signin=1.

Reason:

/app?signin=1 is intended as a traveler sign-in entry.

If an admin/moderator session is still active, Index.tsx staff redirect can immediately push to /admin, which is the glitch the user saw.

Suggested flow:

ts

const handleTravelerClick = async () => {

  setStoredRole("patient");

  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {

    await supabase.auth.signOut();

  }

  navigate`/app?signin=1${returnToParam}`);

};

If you want to avoid signing out real patient users, use a role check:

if current session has admin/moderator/provider role, sign out before traveler flow

if current session is normal patient, navigate to /app

But simple sign-out on explicit Traveler chooser click is acceptable because this is an auth chooser entry point.

4. src/pages/Auth.tsx — preserve and forward returnTo

Read returnTo from useSearchParams.

Traveler card should forward it:

text

/auth?returnTo=/app/journey

→ Traveler click

→ /app?signin=1&returnTo=/app/journey

Safety:

only allow same-origin app paths

allow values that start with /app or /ar/app

reject http..., //..., or external paths

Provider buttons should not use the traveler returnTo unless there is an explicit provider return path.

5. src/pages/LandingBelow.tsx

Change the bottom CTA “Open RufayQ / افتح رُفَيِّق”:

unauthenticated public visitors should go to /auth

do not send them to raw /app

this should match the hero “Start Free” CTA behavior

If the component has session-aware logic:

authenticated/guest → /app

unauthenticated → /auth

If no session-aware logic exists:

route this public CTA directly to /auth.

If goToApp becomes unused after this, remove the prop from:

LandingBelow.tsx

parent call site in Landing.tsx

6. New src/components/AppAuthGuard.tsx

Add a small client guard around /app and /ar/app.

Logic:

text

1. If URL has ?signin=1:

   render children.

   This preserves the inline traveler sign-in flow.

2. If localStorage has rufayq_guest_ok:

   render children.

   This preserves guest mode.

3. Else get Supabase session:

   - session exists:

       render children.

   - no session:

       navigate`/auth?returnTo=${encodeURIComponent(pathname + search)}`, { replace: true })

4. While checking:

   render null or a tiny loading shell to avoid flashing LoginScreen before redirect.

Also subscribe to supabase.auth.onAuthStateChange so the guard reacts to sign-in/out changes.

7. src/App.tsx

Wrap only these routes:

tsx

<Route

  path="/app"

  element={

    <Shelled>

      <AppAuthGuard>

        <Index />

      </AppAuthGuard>

    </Shelled>

  }

/>

<Route

  path="/ar/app"

  element={

    <Shelled>

      <AppAuthGuard>

        <Index />

      </AppAuthGuard>

    </Shelled>

  }

/>

Do not wrap:

/auth

/provider/login

/provider

/admin

/admin/login

/app/wallet

/app/dashboard/subscription

Unless explicitly required later.

8. src/pages/Index.tsx — consume returnTo after traveler/patient login

In handleLogin, after these branches enter the patient app:

guest_patient

patient_ok

check:

ts

const returnTo = searchParams.get("returnTo");

If valid and same-origin app path:

ts

navigate(returnTo, { replace: true });

Safety:

allow only /app... and /ar/app...

reject //...

reject http://... / https://...

reject /admin...

reject /provider...

Important:

Do not apply this to doctor_ok.

Do not apply this to admin/staff redirect.

Staff/provider branches remain untouched.

9. src/pages/Index.tsx — staff auto-redirect should not steal /app?signin=1

Currently staff auto-redirect sends signed-in admin/moderator users on /app to /admin.

Keep this behavior for normal /app access.

But avoid stealing the explicit traveler sign-in path:

text

/app?signin=1

If forceSignIn is true, do not auto-redirect to /admin before the traveler sign-in screen can render.

Suggested adjustment:

ts

if (forceSignIn) return;

inside the staff auto-redirect effect before role lookup.

This prevents:

Auth chooser Traveler click

/app?signin=1

immediate /admin redirect due to an existing staff session

Combined with the Auth chooser sign-out, this makes the bug much less likely.

10. Tests

Add/update tests.

Auth chooser tests

/auth shows Traveler, not Patient.

Traveler card sets stored role to "patient".

Traveler card routes to /app?signin=1.

Traveler card preserves valid returnTo.

Traveler card rejects unsafe returnTo.

Provider card flow still goes to provider path.

Guard tests

unauthenticated /app → /auth?returnTo=/app

unauthenticated /app?signin=1 → renders children, no redirect

guest with rufayq_guest_ok → renders children, no redirect

authenticated session → renders children, no redirect

Index tests

forceSignIn path does not trigger staff auto-redirect before login.

patient_ok with valid returnTo=/app... navigates there.

invalid returnTo values are ignored.

doctor_ok still routes to /provider.

normal signed-in staff direct /app still redirects to /admin.

Landing CTA tests

Header Sign In → /auth

Hero Start Free → /auth

Bottom Open RufayQ → /auth

No unauthenticated public CTA routes to /admin

No unauthenticated public CTA routes directly to raw /app

Out of scope

Backend changes

RLS changes

Provider login redesign

Admin login redesign

Removing guest mode

Removing inline traveler sign-in

Renaming internal role value from "patient" to "traveler"

Changing staff /admin redirect for normal signed-in staff access

Verification

Manual verification:

Unauthenticated cold visit to /app

expected: /auth?returnTo=/app

Unauthenticated visit to /app?signin=1

expected: inline traveler sign-in screen

no redirect loop

Landing Hero “Start Free”

expected: /auth

Landing bottom “Open RufayQ”

expected: /auth

/auth chooser

expected: first card says Traveler / مسافر علاجي

clicking it goes to /app?signin=1

it does not go to /admin

If an admin/staff session exists and user clicks Traveler on /auth

expected: session is cleared or staff redirect is skipped for signin=1

user sees traveler sign-in, not /admin

Guest user with rufayq_guest_ok

expected: /app loads directly

Authenticated patient

expected: /app loads directly

Normal authenticated staff direct visit to /app

expected: still redirects to /admin

Provider choice

expected: provider flow still goes to /provider/login

---

## Key corrections to your original plan

### Change “Patient” to “Traveler”

Your original plan still says:

> Patient card on `/auth` chooser

But your product requirement is now:

> Traveler / Traveller

I recommend **Traveler** with one “l” if your UI is mostly US English, which it appears to be `Sign In`, `Start Free`, etc.). If your brand voice is UK/international English, use **Traveller**. For consistency with current app copy, I’d choose:

> **Traveler**

Arabic:

> **مسافر علاجي**

or shorter:

> **مسافر**

---

### Do not call the admin redirect “correct and out of scope” anymore

Your original plan said:

> The earlier `/admin` redirect came from `Index.tsx:62-70`, which auto-pushes signed-in staff to `/admin` after they hit `/app` — that's correct staff behaviour and out of scope here.

That is only partially true.

For normal signed-in staff visiting `/app`, yes, redirecting to `/admin` is correct. 【F:src/pages/Index.tsx†L61-L70】

But for the explicit **Traveler sign-in** route:

```text

/app?signin=1

the redirect should not steal the flow before the user can sign in as a traveler.

So make this in scope:

Staff redirect remains for normal /app, but must not hijack /app?signin=1.

Make Auth chooser set the role explicitly

This is a crucial fix.

The current /auth Traveler/Patient card just does:

ts

navigate("/app?signin=1")

【F:src/pages/Auth.tsx†L67-L70】

It does not set rufayq_role.

But Index.tsx and RoleSelectorScreen rely on stored role preference for post-login validation. RoleSelectorScreen reads/writes rufayq_role and validates only "patient" or "doctor". 【F:src/screens/RoleSelectorScreen.tsx†L39-L48】【F:src/screens/RoleSelectorScreen.tsx†L83-L98】

So the /auth Traveler card should explicitly set:

text

rufayq_role = patient

before navigating to /app?signin=1.

Final recommendation

Send the updated plan above to Lovable.

The two most important additions are:

Rename user-facing Patient to Traveler, but keep internal role "patient" for now.

Prevent /app?signin=1 Traveler sign-in from being hijacked by stale role/session/admin redirect.