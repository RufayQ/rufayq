## Goal

Close the two `realtime.messages` topic-policy gaps flagged by the scanner:

1. `lounge_memberships_realtime_no_topic_policy` — anyone subscribing to the global `lounge-memberships` channel receives row-change payloads (card_last4, membership_number, program) for other users.
2. `realtime_chat_tables_no_topic_policy` — anyone subscribing to `chat-thread-<id>`, `chat-receipts-<id>`, `chat-inbox-shared`, or `global-chat-awareness` can receive change events for `chat_threads`, `chat_messages`, `chat_participants`.

Today only `pn:<device_id>` and `pf:<device_id>` topics are allowed by `realtime.messages` RLS. We will (a) move all lounge/chat channels to device- or participant-scoped topic names and (b) extend the topic SELECT policy to match those new scopes.

## Plan

### 1. Rename frontend channel topics to include device / thread scoping

Update channel names so the topic itself encodes who is allowed to subscribe. No business-logic changes — same `postgres_changes` handlers.

- `src/lib/loungeMemberships.ts` → `lm:<device_id>`
- `src/hooks/useChatInbox.ts` → `ci:<device_id>`
- `src/hooks/useGlobalChat.ts` → `ga:<device_id>`
- `src/hooks/useChatThread.ts` → `ct:<thread_id>:<device_id>`
- `src/hooks/useThreadReadReceipts.ts` → `cr:<thread_id>:<device_id>`

Each hook already has access to the device id (via the same helper used elsewhere, e.g. `getDeviceId()` / the existing device-id context). The thread-scoped topics still include `device_id` so the topic policy can verify the caller is a participant of that thread using their device id.

### 2. New SQL migration: extend `realtime.messages` SELECT policy

Add a helper and broaden the existing topic allowlist. Single migration:

- Create `public.realtime_caller_in_thread(_thread uuid, _device text) returns boolean` as `SECURITY DEFINER`, that returns true when a `chat_participants` row exists with `thread_id = _thread` AND (`device_id = _device` OR caller is an org member of that participant's `organization_id`). Reuse the same logic as `chat_caller_participates`.
- Drop and recreate `"Device-scoped realtime topic read"` on `realtime.messages` to also allow:
  - `lm:<device_id>`, `ci:<device_id>`, `ga:<device_id>` (device-owned topics)
  - `ct:<thread_id>:<device_id>` / `cr:<thread_id>:<device_id>` when `realtime_caller_in_thread(thread_id, device_id)` returns true.
- Mirror the same conditions in the INSERT (`write`) policy so future broadcast publishes are equally scoped.

The header `x-device-id` is already injected by the Supabase JS client setup for realtime auth, matching the pattern used by the existing `pn:` / `pf:` policies.

### 3. No business-logic changes

Underlying table RLS on `lounge_memberships`, `chat_messages`, `chat_participants`, `chat_threads` already filters rows. This change only restricts who can subscribe to the topic in the first place, eliminating the cross-user payload leak.

### 4. Mark findings fixed

After the migration is approved and clients are updated, mark `lounge_memberships_realtime_no_topic_policy` and `realtime_chat_tables_no_topic_policy` as fixed via `security--manage_security_finding` with an explanation referencing the new topic-scoped policy.

## Files touched

- New: `supabase/migrations/<ts>_realtime_topic_scoping.sql`
- Edited: `src/lib/loungeMemberships.ts`, `src/hooks/useChatInbox.ts`, `src/hooks/useGlobalChat.ts`, `src/hooks/useChatThread.ts`, `src/hooks/useThreadReadReceipts.ts`
