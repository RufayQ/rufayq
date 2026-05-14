## Harden `AppAuthGuard` with safe returnTo + Arabic auth route

Rewrite `src/components/AppAuthGuard.tsx` to combine the current auth-state reactivity with explicit safety helpers, and confirm route coverage in `src/App.tsx`.

### Changes to `src/components/AppAuthGuard.tsx`

Add three pure helpers at module scope:

```ts
const isSafeAppPath = (p: string) =>
  p === "/app" || p.startsWith("/app/") ||
  p === "/ar/app" || p.startsWith("/ar/app/");

const safeReturnTo = (pathname: string, search: string) =>
  isSafeAppPath(pathname) ? `${pathname}${search}` : "/app";

const authPathFor = (pathname: string) =>
  pathname.startsWith("/ar/") ? "/ar/auth" : "/auth";

const hasGuestOk = () => {
  try { return localStorage.getItem("rufayq_guest_ok") === "1"; }
  catch { return false; }
};
```

Update `evaluate` to use them:

```ts
const dest = safeReturnTo(location.pathname, location.search);
const authPath = authPathFor(location.pathname);
navigate(`${authPath}?returnTo=${encodeURIComponent(dest)}`, { replace: true });
```

Keep:

- `?signin=1` short-circuit (renders inline Traveler sign-in).
- `supabase.auth.getSession()` initial check with `.catch(() => evaluate(false))`.
- `onAuthStateChange` subscription so sign-out/in reacts live.
- `cancelled` flag and unsubscribe cleanup.
- Tighten guest check from `!!localStorage.getItem(...)` to strict `=== "1"` for consistency with `useGuestMode` and `LoginScreen`.

### Changes to `src/App.tsx`

Wrap the remaining app subroutes with `<AppAuthGuard>` so the guard isn't bypassed via direct navigation:

```tsx
<Route path="/app/dashboard/subscription" element={<Shelled><AppAuthGuard><SubscriptionDashboard /></AppAuthGuard></Shelled>} />
<Route path="/app/wallet"                 element={<Shelled><AppAuthGuard><WalletLedger /></AppAuthGuard></Shelled>} />
<Route path="/ar/app/dashboard/subscription" element={<Shelled><AppAuthGuard><SubscriptionDashboard /></AppAuthGuard></Shelled>} />
<Route path="/ar/app/wallet"                 element={<Shelled><AppAuthGuard><WalletLedger /></AppAuthGuard></Shelled>} />
```

`/app` and `/ar/app` are already wrapped — no change there.

Acceptance checks

- `/app` (no session) → `/auth?returnTo=%2Fapp`
- `/ar/app` (no session) → `/ar/auth?returnTo=%2Far%2Fapp`
- `/app/wallet?x=1` (no session) → `/auth?returnTo=%2Fapp%2Fwallet%3Fx%3D1`
- `/ar/app/dashboard/subscription` (no session) → `/ar/auth?returnTo=%2Far%2Fapp%2Fdashboard%2Fsubscription`
- `localStorage.rufayq_guest_ok === "1"` → renders app
- `?signin=1` → renders inline Traveler sign-in
- Sign-out while on `/app` → redirects to `/auth`
- Unsafe pathnames cannot leak into `returnTo` (validator clamps to `/app`)

### 1. If you create `src/components/AppAuthGuard.tsx`, remove the inline `AppAuthGuard` from `src/App.tsx` and import the new component there. Do not leave two guard implementations.

2. Keep the guard outside `Shelled` for app routes unless there is a specific reason to load the shell before auth is checked. Prefer:

<Route path="/app" element={<AppAuthGuard><Shelled><Index /></Shelled></AppAuthGuard>} />

<Route path="/ar/app" element={<AppAuthGuard><Shelled><Index /></Shelled></AppAuthGuard>} />

<Route path="/app/dashboard/subscription" element={<AppAuthGuard><Shelled><SubscriptionDashboard /></Shelled></AppAuthGuard>} />

<Route path="/app/wallet" element={<AppAuthGuard><Shelled><WalletLedger /></Shelled></AppAuthGuard>} />

<Route path="/ar/app/dashboard/subscription" element={<AppAuthGuard><Shelled><SubscriptionDashboard /></Shelled></AppAuthGuard>} />

<Route path="/ar/app/wallet" element={<AppAuthGuard><Shelled><WalletLedger /></Shelled></AppAuthGuard>} />

The current routes are already covered, so this should be a refactor/hardening, not a route coverage expansion.

Please implement the new component with:

- `isSafeAppPath(pathname)`

- `safeReturnTo(pathname, search)`

- `authPathFor(pathname)` returning `/ar/auth` for Arabic app routes

- `hasGuestOk()` checking `localStorage.getItem("rufayq_guest_ok") === "1"`

- `?signin=1` short-circuit

- initial `supabase.auth.getSession()`

- `supabase.auth.onAuthStateChange(...)` subscription

- cleanup/unsubscribe on unmount

- a non-blank fallback while checking if possible

Acceptance checks:

- `/app` unauthenticated redirects to `/auth?returnTo=%2Fapp`

- `/ar/app` unauthenticated redirects to `/ar/auth?returnTo=%2Far%2Fapp`

- `/app/wallet?x=1` unauthenticated redirects to `/auth?returnTo=%2Fapp%2Fwallet%3Fx%3D1`

- `/ar/app/dashboard/subscription` unauthenticated redirects to `/ar/auth?returnTo=%2Far%2Fapp%2Fdashboard%2Fsubscription`

- `localStorage.rufayq_guest_ok === "1"` allows app access

- `?signin=1` allows inline Traveler sign-in

- sign-out while on an app route redirects to auth

- unsafe paths cannot leak into returnTo

- `npm run test`, `npx tsc --noEmit`, and `npm run build` pass

Why these corrections matter

1. The current app routes are already guarded

Lovable says “wrap the remaining app subroutes,” but in the current repo those routes are already guarded:

/app

/ar/app

/app/dashboard/subscription

/app/wallet

/ar/app/dashboard/subscription

/ar/app/wallet

All are already wrapped with AppAuthGuard. 【F:src/App.tsx†L133-L146】

So this should be framed as a hardening/refactor, not as adding missing route coverage.

2. Keep the guard outside Shelled

Current pattern:

tsx

<AppAuthGuard>

  <Shelled>...</Shelled>

</AppAuthGuard>

This is better for unauthenticated users because AppShell is only loaded/rendered after the guard allows access. Shelled loads the heavier app shell. 【F:src/App.tsx†L86-L90】

Lovable’s suggested pattern:

tsx

<Shelled>

  <AppAuthGuard>...</AppAuthGuard>

</Shelled>

That still works functionally, but it may load app-shell providers before the auth decision. I would keep the current outer-guard pattern.

3. Strict guest flag check is necessary

Lovable is correct to tighten guest mode to:

ts

localStorage.getItem("rufayq_guest_ok") === "1"

The current guard incorrectly checks for "true". 【F:src/App.tsx†L62-L66】

But the login screen writes "1" when the user continues as guest. 【F:src/screens/LoginScreen.tsx†L401-L401】【F:src/screens/LoginScreen.tsx†L495-L495】

The useGuestMode hook also checks for "1". 【F:src/hooks/useGuestMode.ts†L4-L12】

So Lovable’s strict "1" check is the right fix.

4. /ar/auth must be preserved

Current code correctly sends Arabic app routes to /ar/auth. 【F:src/App.tsx†L72-L75】

Lovable’s updated proposal includes authPathFor, which preserves that behavior. That part should be accepted.

5. Live auth-state reactivity is a good improvement

The current inline guard checks the session once in an effect. 【F:src/App.tsx†L59-L69】

Lovable’s proposal adds supabase.auth.onAuthStateChange(...), which is better because:

sign-out on an app route redirects without refresh;

sign-in clears the gate;

session changes are handled consistently.

That part should be accepted.

Final recommendation

Tell Lovable:

“Proceed, but make it a clean refactor: move the guard into src/components/AppAuthGuard.tsx, import it in src/App.tsx, remove the inline guard, keep the guard outside Shelled, preserve all currently guarded routes, and use the strict safe-return/Arabic-auth/guest-flag helpers.”

That gives you the best version: safe, reactive, localized, and consistent with the existing app architecture.

Commands I used to verify the repo context

✅ git status --short && nl -ba src/App.tsx | sed -n '1,160p' && find src -maxdepth 3 -name 'AppAuthGuard.tsx' -print