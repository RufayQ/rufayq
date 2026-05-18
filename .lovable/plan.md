## What's happening

All three symptoms come from one root cause: a **Supabase auth restore race** on app start / tab switch.

`src/hooks/useAuthUserId.ts` initialises `userId` to `null`, then resolves it asynchronously via `supabase.auth.getUser()`. Every screen that depends on the user fires its first query during that ~50–300 ms gap when `userId` is still `null` and the auth token may not yet be attached to the Supabase client.

Concrete consequences in the current code:

1. **Home dashboards show 0** — `HomeScreen` calls `useArtifactCount({ userId: authUserId })`. On the first render `authUserId === null`, so the hook takes the guest branch (`.eq("device_id", deviceId)`) and queries `transport_attachments` filtered only by this device. A signed‑in user on a new device gets 0 back. The hook re‑runs when `userId` flips, but if anything else (network, retry) delays the second run, the user briefly — or sometimes persistently — sees zeros.

2. **Journey tab loads empty** — `useJourneys` calls `journeyApi.list()` inside its first `useEffect`. If RLS evaluates `auth.uid()` as null at that moment, the response is `[]` with no error. `setIsLoading(false)` runs, so the screen renders the "no journeys" state with stale empty data. There is no retry tied to auth becoming ready.

3. **"We hit a snag loading that screen" toast → bounced to Home** — `TabErrorBoundary` (wired in `Index.tsx`) catches a render‑time throw inside `JourneyScreen` and calls `handleTabRenderError`, which swaps back to the last‑good tab and shows that exact bilingual toast. The throws happen when downstream Journey code reads a property off a row that the empty/partial response didn't include (e.g., `.find(...).something` when `.find` returned `undefined` because the list came back empty during the auth gap).

These three are the same bug viewed from three screens.

## Fix

### 1. Introduce a real auth‑ready signal

Replace `useAuthUserId` (or extend it) with `useAuthSession()` returning `{ userId, isReady }`.

```text
useAuthSession()
  isReady=false on mount
  supabase.auth.getSession() resolves   -> userId set, isReady=true
  onAuthStateChange fires                -> userId updated, isReady stays true
```

Use `getSession()` (reads from storage synchronously‑ish) not `getUser()` (network round‑trip) so the gap is much smaller and we get an actual "ready" moment.

### 2. Gate data hooks on `isReady`

- `useArtifactCount`: do not run the query until `isReady` is true. While not ready, return `null` (so callers can show a skeleton) or hold the previous count.
- `useJourneys`: in its `refresh` effect, skip the call while `!isReady`. When `isReady` becomes true, run once. Keep guest mode behaviour unchanged.

### 3. Stop dashboards flashing zeros

In `HomeScreen` and the Journey landing view: while `!isReady`, render the existing skeleton/placeholder for the counts rather than the literal "0". Only show "0" when we know the query actually returned zero.

### 4. Harden `JourneyScreen` against empty/partial first responses

In `JourneyScreen` (and the helpers it calls), audit the spots that read off `.find(...)`, `journeys[0]`, `dbTrips[0].something`, transport timeline rows, etc., and add `?.` / explicit empty guards so an empty list during the auth gap can never throw. This removes the "We hit a snag" trigger even if a future regression brings the race back.

Also: in `handleTabRenderError`, log `error.stack` and the failing `tabKey` to `console.error` so the next occurrence shows up cleanly in the preview console — today we only log the message.

### 5. Validation

- Hard refresh while signed in → Home shows skeletons for Trips/Records/Reminders/Planned, then real counts. Never "0 → real value" flash.
- Open Journey tab immediately after refresh → list shows skeleton, then journeys. No empty‑state flash.
- Sign out → in → Home counts and Journey list update without manual reload.
- Toggle airplane mode briefly to force a slow auth restore → no "We hit a snag" toast.

## Technical notes

- All changes are client‑side; no schema, RLS, or edge function changes.
- React Query is not used here, so gating is done by guarding the `useEffect` body on `isReady`, not via an `enabled` flag.
- `useAuthUserId` is consumed in many places; ship it as a non‑breaking superset by exporting both the old default (`userId`) and the new `useAuthSession` hook, and migrate `HomeScreen`, `JourneyScreen`, `useJourneys`, and `useArtifactCount` to the new one.