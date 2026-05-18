# Share attachments from My Records in AI Chat (Companion+)

## Goal
In the Chat → Upload sheet, add a new source: **"From My Records"**. Companion and Family subscribers can pick any document they've already saved (travel attachments + scanned medical records) and attach it to the AI chat. Free and Starter users see an upgrade prompt instead.

Camera / Files uploads stay free and unchanged.

## Tier gating

Plan codes from `useSubscription()` (`src/data/subscriptionPlans.ts`):
- `FREE`, `STARTER` → blocked, show `<UpgradePrompt variant="subscriber" plan="COMPANION" />` with copy framing it as a Companion/Elite feature.
- `COMPANION`, `FAMILY` → open the records picker.
- No subscription loaded yet → treat as FREE (safer default).

The existing `UpgradePrompt` component is reused — no new modal. We pass a context message via a new optional prop `feature?: string` so the header can read "Attach from My Records — Companion+ feature" (small additive change).

## New component

`src/components/chat/ChatRecordsPicker.tsx` — bottom sheet that:

1. Loads two record sources in parallel:
   - **Travel attachments**: `supabase.from("transport_attachments").select(...).eq("device_id", deviceId).is("deleted_at", null).order("created_at", { ascending: false }).limit(100)` — uses the same shape as `RelatedDocumentsCard` / `TravelRecordsList`.
   - **Medical scanned records**: `listScannedRecords()` from `src/lib/scannedRecordsStore.ts` (already a local store).
2. Renders unified rows: icon (FileText / ImageIcon), label, file_name, date, source chip (`Travel` gold / `Medical` teal). Search input at the top filters by label/file_name. Empty state if both sources return nothing.
3. On tap → calls `onPick({ kind, label, file_name, sourceLabelEn, sourceLabelAr, signedUrl? })` and closes. For travel attachments we generate a signed URL via `supabase.storage.from("transport-attachments").createSignedUrl(file_path, 3600)` so the AI text message can include a viewable link.

Props:
```ts
{ open: boolean; onClose: () => void; onPick: (pick: PickedRecord) => void; }
```

## Wire-up in `src/screens/ChatScreen.tsx`

- Import `useSubscription` + `ChatRecordsPicker`.
- New state: `selectedRecord: PickedRecord | null`, `showRecordsPicker: boolean`.
- Add a **third button** in the source row (currently Camera + Files) labelled `📂 My Records · سجلاتي`. On click:
  - If plan ∈ {COMPANION, FAMILY} → `setShowRecordsPicker(true)`.
  - Else → `setUpgradeCtx({ variant: "subscriber", plan: "COMPANION" })` and `setShowUpgrade(true)`. Toast a short bilingual "Companion feature · ميزة كومبانيون" hint as a fallback if upgrade prompt is dismissed.
- When the picker resolves, store the result in `selectedRecord` and render a compact preview card directly below the source row (separate from the file `<FileUploadPreview>` block) showing icon, label, file_name, source chip, and an `X` to clear.
- `handleUploadSend` is extended so either `uploadedFile` OR `selectedRecord` is sent. For a record, the message body becomes:
  ```
  📎 From my records: <label> — <file_name>
  <signedUrl if present>
  <uploadInstruction or "أرفقت سجلًا للمراجعة">
  ```
  After send, clear both `uploadedFile` and `selectedRecord`.
- The Send button text/visibility condition updates from `if (uploadedFile)` to `if (uploadedFile || selectedRecord)`.

## Out of scope

- Multi-select: pick one record at a time (matches single-file upload behavior).
- Re-uploading the record's binary into the AI request. The chat pipeline today sends only text; we send a signed URL + label, which the AI can reference. A real file-binary path is a separate task.
- New plan codes or pricing changes.
- Gating Camera/Files (those stay free as today).
- Admin-side review of which records get shared.
