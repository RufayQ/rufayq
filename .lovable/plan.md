## Problems found

After tracing the code paths for the three behaviours in the screenshots:

### 1. "Attach from Records" picker (Journey milestone) is empty

`openFromRecords()` in `src/components/RelatedDocumentsCard.tsx` (lines 355–369) queries **only** `transport_attachments`. It ignores:

- `listTravelScannedRecords()` — the 7 visa/passport/booking scans shown in Records
- `listScannedRecords()` — medical scans
- Lounge cards

So a user with a full Records list still sees "No other records available".

### 2. "Apply to milestone" is greyed out in Records

- `TravelRecordsList.tsx` (line 784) only passes `onApplyToMilestone` when `kind === "attachment"`. The screenshot is a `scanned-travel` row → callback is `undefined` → the action is disabled.
- `RecordsScreen.tsx` (line 713) wires the callback but only fires a toast: no row is inserted, so the milestone's Related Documents card never updates.

### 3. Chat attachment + tier wiring

- `ChatRecordsPicker.tsx` queries `transport_attachments` by `device_id` only (drops signed-in cross-device) and merges `listScannedRecords()` (medical) — but never `listTravelScannedRecords()`. So the very rows the user sees in Records are missing.
- `TravelRecordsList.tsx` never passes `onSendToChat`, so "Send to chat" in the kebab menu is always disabled.
- `RecordsScreen.tsx`'s `onSendToChat` just inserts a text snippet into the chat input — no `PickedRecord` payload, no signed URL.
- `ChatRecordsPicker` shows a "COMPANION+" badge that contradicts `attachmentGating.ts` (records-sharing is FREE on every tier). The device-upload gate to Companion+ is correct but the paywall path needs a clearer hint.

---

## Slices

### Slice A — Unified record source

Add `src/lib/records/recordSources.ts` exposing `listAllUserRecords({ userId, deviceId })` and a `resolveSignedUrl(record)` helper. It aggregates four sources into one `UnifiedRecord` shape:

```ts
type UnifiedRecord = {
  id: string;                  // stable, source-prefixed
  origin: "transport" | "travel-scan" | "medical-scan" | "lounge";
  label: string;
  fileName: string;
  mimeType: string | null;
  dateLabel: string;
  sourceLabelEn: string;       // "Travel" | "Medical" | "Lounge"
  sourceLabelAr: string;
  // For storage-backed rows
  filePath?: string;
  // For local-store rows that need URL on demand
  resolveUrl?: () => Promise<string | null>;
};
```

Sources:

1. `transport_attachments` — OR-shaped query (`user_id` OR `device_id`), `deleted_at IS NULL`.
2. `listTravelScannedRecords()` — Records' travel scans.
3. `listScannedRecords()` — medical scans.
4. `listLoungeMemberships()` — exposed but flagged `linkable: false` for milestone/chat where a file is required.

### Slice B — Journey "Attach from Records" picker

Rewrite `openFromRecords()` in `RelatedDocumentsCard.tsx` to call `listAllUserRecords()` and drop rows whose file_path already exists in the current milestone. On `linkExisting()`:

- `origin === "transport"` → current behaviour (insert sibling row pointing at the same `file_path`).
- `origin === "travel-scan" | "medical-scan"` → upload the scan's rendered file/blob into the `transport-attachments` bucket once (idempotent path `scan-imports/{record.id}.<ext>`), then insert the `transport_attachments` row with `segment_ref + ticket_id` plus `key_fields` copied across.

Picker UI updates: section headers ("Saved attachments · المرفقات", "From Records · من السجلات"), inline source badge, search box (parity with chat picker).

### Slice C — "Apply to milestone" works everywhere

1. `TravelRecordsList.tsx` — extend `onApplyToMilestone` to handle `scanned-travel` (reuse the same scan-import path from Slice B). Leave `lounge-card` excluded (no file to link).
2. `RecordsScreen.tsx` — replace the toast-only stub with a real `transport_attachments` insert keyed by `segment_ref = "milestone-<id>"` (or `flight-<refId>` for departure/return), mirroring `applyToMilestone()` in `TravelRecordsList`. After insert, the relevant milestone's `RelatedDocumentsCard` auto-refreshes through its existing query.
3. Centralise the milestone-key derivation in `src/lib/records/milestoneKey.ts` so both screens use one mapping.

### Slice D — Chat attachment + tier semantics

1. `ChatRecordsPicker.tsx` — load via `listAllUserRecords()` (now includes travel scans). Resolve `signedUrl` on pick through `resolveSignedUrl()`.
2. Replace the misleading "COMPANION+" badge with a "FREE · مجاني" pill; keep `handleOpenRecords` ungated (already correct).
3. `TravelRecordsList.tsx` — wire `onSendToChat` for both `attachment` and `scanned-travel` rows. Store a `PickedRecord` payload via a tiny handoff (`sessionStorage["chat:pendingAttachment"]`) and `onNavigate?.("chat")`. `ChatScreen` reads & clears the handoff on mount, pre-selecting the record in the upload sheet.
4. `ChatScreen.tsx` — when device-upload paywall fires, surface the existing `UpgradeSheet` (already wired) with copy: "Camera & Files are Companion+ — sharing saved records is free on every plan."
5. Update `attachmentGating.test.ts` to assert the contract for every plan code (FREE, STARTER, COMPANION, FAMILY, null/guest).

### Slice E — Tests + QA doc

- New unit tests for `listAllUserRecords()` (merges three stores + dedupes).
- E2E (vitest + RTL) for:
  - Journey picker shows travel + medical scans.
  - "Apply to milestone" on a scanned-travel row inserts an attachment row.
  - "Send to chat" hands the record over and the chat upload sheet pre-fills it.
- Append a "Records ↔ Journey ↔ Chat parity" section to `docs/qa/canonical-ux-parity.md` covering the new flows.

---

### **Enhancements I strongly recommend**

## **1) Add deterministic dedupe strategy in Slice A**

In listAllUserRecords(), define explicit dedupe key priority:

1. origin+filePath (if present),
2. else origin+id.  
Also define deterministic sort (newest first, with source tie-breaker) so picker order is stable and testable.

### **2) Define explicit import idempotency contract**

For scan-imports in Slice B/C:

- Path should be content-stable (or record-id stable) and **upsert-safe**.
- Before upload, check if scan-imports/{[record.id](http://record.id)}.* already mapped in DB (or storage metadata), to prevent duplicate file copies.
- If two actions race (“Apply to milestone” + “Send to chat”), handle gracefully.

### **3) Keep UnifiedRecord capability flags**

Extend shape with:

- linkableToMilestone: boolean
- sendableToChat: boolean
- previewable: boolean  
This avoids ad-hoc origin checks spread through UI.

### **4) Apply-to-milestone should be shared util, not duplicated logic**

You already propose milestoneKey.ts — great.  
Also add one shared helper like:  
linkRecordToMilestone(unifiedRecord, milestone, context)  
and use it from both TravelRecordsList and RecordsScreen so behavior can’t drift.

### **5) Chat handoff should support both sessionStorage + in-memory fallback**

sessionStorage["chat:pendingAttachment"] is good.  
Also support direct state handoff when same-page navigation happens without reload, then clear both sources on consume.

### **6) Clarify guest behavior in acceptance criteria**

Explicitly state:

- Guest can see and send **their local/device records**.
- Cross-device records require signed-in identity.  
This avoids confusion when validating “works on every tier including guests.”

### **7) Add one migration/compat section**

If old picker code expects TransportAttachment, include adapter mappers during transition, then remove in Slice E cleanup.

  


---

### **Suggested extra tests (high-value)**

- **Idempotent import test:** applying same scanned-travel record to same milestone twice does not duplicate.
- **Cross-device signed-in fetch test:** OR query returns records when device_id differs but user_id matches.
- **Handoff expiry test:** stale chat:pendingAttachment is ignored.
- **Capability matrix test:** each origin’s linkable/chatSendable flags.  
  
  
**Acceptance criteria**

- From any milestone, "Attach from Records" lists every record the user has in the Records screen (travel scans + medical scans + previously linked attachments) and linking persists.
- From any Records row (attachment OR scanned-travel), "Apply to milestone" is enabled, opens the milestone picker, and the linked row appears in that milestone's Related Documents card.
- From any Records row, "Send to chat" navigates to chat with the record pre-attached as a `PickedRecord` (no manual re-pick required).
- Chat upload sheet: Camera/Files gated to Companion+ with a clear paywall sheet; "My Records" works on every tier including guests and lists travel + medical scans.
- ESLint canonical-overlay guard from the previous slice still passes (new pickers reuse `OverlayLayer`).
- All new + existing tests green.
- **No duplicate storage artifacts:** repeated link/send actions for same scanned record do not create duplicate bucket files or duplicate attachment rows for same milestone+file path.
- **Stable picker UX:** same user/data always yields same ordering and source badges in Journey and Chat pickers.