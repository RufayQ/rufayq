# Migrate ChatRecordsPicker to Records data sources

## Problem

The chat "Attach from My Records" sheet shows fewer records than the Records screen because it reads through `listAllUserRecords()` (a unified merger) which:

- Filters out scans that lack `fileUrl` / `pdfUrl` / `pageImages` (`sendableToChat: false`).
- Hides lounge cards (`fileBackedOnly: true`).
- Caches results for 4s and re-hydrates `fileUrl` from IndexedDB asynchronously, so freshly-added records can be invisible on first open.

The Records screen instead reads the three underlying sources directly and re-renders on their native update events, so it is always in sync.

## Goal

The chat picker must show **exactly** what the Records screen shows, sourced from the same readers, and stay in sync the same way. ChatRecordsPicker UI is preserved (search, Travel/Medical filters, FREE chip, attached-summary card, error/retry, keyboard-arming pattern) — only the data layer is replaced.

## Approach

1. **New reader** in `src/lib/records/recordSources.ts`:
   `listAllRecordsForPicker({ userId, deviceId })` — merges the same three sources the Records screen uses, with no `sendableToChat` or `fileBackedOnly` filtering:
   - `transport_attachments` rows (same query TravelRecordsList runs).
   - `listTravelScannedRecords()` from the local store.
   - `listScannedRecords()` from the local store.
   Returns `UnifiedRecord[]` with:
   - `linkableToMilestone` / `previewable` / `sendableToChat` still set per row (used downstream).
   - A new `attachable: boolean` flag = "this row has bytes we can resolve into a signed URL/data URL right now". Rows without bytes are still listed but the row tile is disabled with a small hint ("No file attached · لا يوجد ملف"), matching how Records itself displays them.
   - Lounge cards are excluded (they are never "documents" — the existing picker never showed them and the Records screen separates them in their own surface).

2. **Rewire ChatRecordsPicker** (`src/components/chat/ChatRecordsPicker.tsx`):
   - Replace the `listAllUserRecords(..., fileBackedOnly: true)` call with `listAllRecordsForPicker(...)`.
   - Remove the `record.sendableToChat` filter; instead use `attachable` to enable/disable the row's pick action.
   - Subscribe to the same update channels the Records screen subscribes to:
     - `subscribeToScannedRecords` (medical local store).
     - `subscribeToTravelScannedRecords` (travel local store).
     - Supabase realtime on `transport_attachments` (same channel name pattern as TravelRecordsList).
     Any event → invalidate cache + reload.
   - On every open: bust the snapshot cache once (already added previously) so freshly-added rows are never hidden.
   - Keep the existing keyboard-arming, error/retry, attached-summary, telemetry, and FREE-chip behaviour untouched.

3. **Preview / handoff path** (`resolveRecordSignedUrl` already supports all three origins). Picks of rows without bytes call `onPick` with `signedUrl = undefined`; the chat upload sheet already handles that (it just sends a label + filename without the URL line) so no change is needed there.

4. **Records screen parity check**: After migration, opening Records and Chat → Attach should show the same row count, same ordering (newest first), same labels, same Travel/Medical tags. Items hidden today (e.g. medical scans whose `fileUrl` hasn't been rehydrated yet) will now appear immediately, going attachable once IndexedDB warms.

## Files touched

- `src/lib/records/recordSources.ts` — add `listAllRecordsForPicker` + `attachable` flag on `UnifiedRecord`.
- `src/components/chat/ChatRecordsPicker.tsx` — swap reader, add subscriptions, gate the row's attach button on `attachable`.
- `src/components/records/UnifiedRecordsPicker.tsx` — no change (alias still re-exports the same component).
- No DB / RLS / edge-function changes.

## Out of scope

- Lounge cards in the chat picker (they have no file; would need a separate UX).
- Changing the chat upload sheet itself.
- Records screen rendering (already canonical).

## Verification

- Open Records → note row count and titles.
- Open Chat → "+" → Attach from My Records → row count and titles must match exactly (minus lounge cards).
- Add a new medical scan → without closing the picker, the new row appears within ~1s (via store event).
- Pick a row that has no bytes → row is disabled with a clear hint; tapping it does nothing.
- Pick a row that has bytes → upload sheet opens pre-filled, signed URL resolves, send works.
