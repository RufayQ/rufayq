# Persist Lounge Cards & Surface in Travel Records

## Problem

- Lounge cards are stored in `localStorage` only (`src/lib/loungeMemberships.ts`, key `rufayq_lounge_memberships_v1`). They vanish on storage clear, sign-out flows, browser switch, or new device — which is why a previously-added card is no longer visible.
- `TravelRecordsList.tsx` already merges lounge memberships into the Travel list and counts them under the **Lounge** chip (lines 162–180). The merge code works — there is simply no data in the store right now.
- Because storage is local, multi-device users will never see their lounge cards consistently, and the Lounge filter count will be unreliable.

## Goal

Lounge cards survive logout, reinstall, and device changes; show up automatically in **Records → Travel** under the **Lounge** chip with correct counts; and remain pin-able.

## Approach

Move lounge memberships to a Lovable Cloud table with RLS, keep the existing `loungeMemberships.ts` API surface (same function names + subscribe pattern) so neither the form nor the Records list need structural changes — just swap the storage backend and add a one-time localStorage migration for any cards still cached on this device.

## Steps

1. **DB migration** — create `public.lounge_memberships`:
   - Columns: `id uuid pk`, `user_id uuid not null` (= `auth.uid()`), `device_id text` (for guest mode parity with `transport_attachments`), `program text`, `membership_number text`, `cardholder_name text`, `card_last4 text`, `expires_on date`, `linked_segment_id text`, `notes text`, `pinned boolean default false`, `created_at`, `updated_at`, `deleted_at`.
   - Enable RLS. Policies: owner can `select/insert/update/delete` where `auth.uid() = user_id`; guest fallback `select/insert/update` where `user_id is null and device_id = current device header` (mirroring `transport_attachments` pattern).
   - `updated_at` trigger.

2. **Rewrite `src/lib/loungeMemberships.ts`** keeping the same exports (`listLoungeMemberships`, `saveLoungeMembership`, `deleteLoungeMembership`, `subscribeLoungeMemberships`, `LoungeMembership` type):
   - Back it with an in-memory cache + Supabase fetch on first call, similar to `useDomainData` pattern.
   - `subscribeLoungeMemberships` becomes a Supabase realtime channel subscription on `lounge_memberships` plus local listeners for optimistic writes.
   - Add `fetchLoungeMemberships()` async helper used on app mount.
   - One-shot migration: on first load, if `localStorage[rufayq_lounge_memberships_v1]` has rows, insert them into Supabase (skipping duplicates by `membership_number`), then clear the key.

3. **Wire fetch on mount** — call `fetchLoungeMemberships()` in `LoungeAccessSection.tsx` `useEffect` and inside `TravelRecordsList.tsx` so both screens hydrate from DB on cold start. No UI changes needed; existing render code already handles the merged rows.

4. **Pin parity** — `TravelRecordsList` already pins by synthetic id `lounge:<uuid>` in localStorage `PIN_KEY`. Leave pin storage local (it's UI state) — works automatically once cards persist.

5. **Smoke check** — add a lounge card, hard refresh, confirm it appears under **Records → Travel → Lounge** chip and on the **Journey → Tickets → Lounge Access** section.

## Technical Notes

- **No client.ts / types.ts edits** — Supabase types regenerate.
- Keep `LoungeMembership.createdAt` as ISO string in the TS type (map `created_at` → `createdAt` in the adapter) so existing components (`LoungeAccessSection`, `TravelRecordsList`) don't change.
- `expiresOn` stays `YYYY-MM-DD`; map to/from `date` column.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.lounge_memberships;` so other tabs/devices update live.
- Guest mode: use `getDeviceId()` from `useDeviceId.ts` for `device_id` column, same as transport attachments.

## Files

- **new**: `supabase/migrations/<ts>_lounge_memberships.sql`
- **rewritten**: `src/lib/loungeMemberships.ts`
- **tiny edits**: `src/components/lounge/LoungeAccessSection.tsx` (call fetch on mount), `src/components/records/TravelRecordsList.tsx` (call fetch on mount)

## Out of Scope

- No design changes — Lounge card visuals, chip styling, and Records row layout stay exactly as they are now.
- No changes to pin storage location.
