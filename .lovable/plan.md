## Goal

Ensure already-installed Android users start receiving chat push without needing to sign out / clear app data. Today the `chat-push` edge function looks up FCM tokens by `device_id`, but existing `device_push_tokens` rows were written before the column existed and have `device_id = NULL`, so they're skipped.

## Approach

Add a one-shot backfill inside `registerPush()` in `src/lib/native/push.ts`:

1. Right after we have a valid session and before registering listeners, run a targeted `UPDATE` on `device_push_tokens` for the **current user + current device_id**, setting `device_id` on any row that still has `NULL` and whose `token` belongs to this device.

   Concretely: when the new `registration` event fires and we upsert the row (already happens), we additionally issue a pre-emptive `UPDATE ... SET device_id = <getDeviceId()> WHERE user_id = <session.user.id> AND platform = <platform> AND device_id IS NULL`. This is safe because a single physical device only has one row per user/platform in practice, and the conditional `IS NULL` guard means we never overwrite another device's claim.

2. Keep the existing `upsert` (with `onConflict: "token"`) — that path still handles the new-install case and token rotation.

3. No DB migration, no edge-function change, no UI change.

## Why this is enough

- `registerPush()` already runs on every cold start after sign-in (the `registered` boolean is module-scoped and resets per process).
- The `UPDATE` happens before the FCM `registration` event fires, so by the time the next chat message lands the row is device-keyed and `chat-push` will resolve it.
- Worst case (user never re-opens the app) is unchanged from today — no regression.

## Files to change

- `src/lib/native/push.ts` — add the `UPDATE` call inside `registerPush()` after the session check, guarded by `isNative`.

## Out of scope

- Backfilling rows for users who haven't opened the app since the column was added — those will self-heal the next time they launch.
- Server-side backfill (would require knowing which token belongs to which device, which only the client knows).
