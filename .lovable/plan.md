Plan to fix the two attachment regressions:

1. Journey milestone attachments

- Update `MilestoneSheet` so every selected milestone has a valid document scope, not only flight milestones.
- Use the canonical `milestoneKeyFor(...)` mapping for `segmentRef` / `ticketId` so Journey, Records, and “Attach from Records” all link to the same milestone key.
- Make `RelatedDocumentsCard` safer inside the milestone sheet:
  - prevent attachment tile / remove / picker clicks from bubbling into the parent milestone card,
  - guard preview opening when a file path is missing or storage URL creation fails,
  - keep the “From Records” picker open/closed state isolated so a failed load shows a toast instead of crashing the screen.

2. Chat attachment entry point

- Fix the AI chat paperclip button so it opens the attachment sheet instead of bypassing it by launching the scanner directly.
- Keep “My Records” visible and free for all tiers from the attachment sheet.
- Keep Camera / Files gated to Companion+ using the existing `attachmentGating` logic.

3. Human/direct chat attachments from the screenshot

- Add a paperclip attachment button to `HumanChatView` beside the emoji/input composer.
- Reuse `ChatRecordsPicker` for “My Records” so already-listed records can be shared from Free/Starter.
- Add Camera / Files actions in a bottom sheet and gate them to Companion+.
- Send attachments through existing `chat_messages.metadata` plus a readable message body, then render an attachment chip in chat bubbles so the UI visibly shows the attached record/file.

4. Shared behavior and validation

- Reuse the existing unified record source (`listAllUserRecords`, `resolveRecordSignedUrl`) so Journey and Chat show the same records.
- Add/update focused tests around:
  - Journey milestone “From Records” open/link flow,
  - AI chat paperclip opening the attachment sheet,
  - human chat showing the attachment button and sending a metadata-backed attachment.
- Run focused tests to verify the crash is gone and attachment options appear in both chat modes.

&nbsp;

## **Enhancements I strongly recommend**

### **1) Milestone attachments are currently flight-only in MilestoneSheet**

Today, RelatedDocumentsCard is rendered only when flightTicketId exists. Non-flight milestones have no per-milestone attachments UI there. 【F:src/components/journey/MilestoneSheet.tsx†L211-L222】

✅ Your plan should explicitly include:

- add a non-flight attachment scope path in MilestoneSheet (not just “valid scope” wording),
- and align with the same key mapping used by Records linking.

---

### **2) RelatedDocumentsCard “From Records” is still source-limited**

openFromRecords() still queries only transport_attachments, so users with scanned travel/medical records can still get an empty picker despite having records elsewhere. 【F:src/components/RelatedDocumentsCard.tsx†L259-L268】

✅ Your plan should explicitly require replacing this query with unified records source (not an additional parallel query path).

---

### **3) “Apply to milestone” behavior for scanned travel is still blocked by implementation**

TravelRecordsList.applyToMilestone exits early for local scanned-travel rows and only inserts for storage-backed attachments. 【F:src/components/records/TravelRecordsList.tsx†L188-L191】【F:src/components/records/TravelRecordsList.tsx†L200-L210】

✅ Your plan should state:

- scanned-travel requires import-to-storage + insert row,
- idempotent import key, and
- shared helper used by both Journey picker and Records action.

---

### **4) Chat attachment architecture needs explicit metadata contract**

Right now AI upload sends attachment as plain text message body (📎 filename...) not structured record metadata. 【F:src/screens/ChatScreen.tsx†L328-L334】

✅ Add explicit chat_messages.metadata.attachment contract in plan so renderer can show consistent chip and deep-link behavior in both AI and human threads.

---

### **5) Paperclip regression root cause must be explicitly patched**

Current AI paperclip handler conditionally calls onOpenScanner first, which bypasses upload sheet. 【F:src/screens/ChatScreen.tsx†L710-L711】【F:src/screens/ChatScreen.tsx†L726-L727】

✅ Update plan to mandate:

- paperclip always opens attachment sheet,
- scanner stays as one option *inside* sheet (not direct shortcut).

---

## **Enhanced version of your plan (recommended)**

1. **Canonical milestone scope mapping**
  - Introduce/standardize milestoneKeyFor(milestone) used by:
    - MilestoneSheet,
    - RelatedDocumentsCard link paths,
    - TravelRecordsList apply flow.
  - Cover both flight and non-flight milestones.
2. **Single unified “From Records” source**
  - RelatedDocumentsCard.openFromRecords() must consume listAllUserRecords.
  - Keep dedupe by file_path for storage-backed records.
  - For local scans, use source+id dedupe and import-on-link.
3. **Shared link helper**
  - Add one helper: linkRecordToMilestone(record, milestoneKey, actorContext).
  - Handles:
    - existing transport attachment row clone,
    - scan import + insert,
    - permission/guard errors with toast-safe fallback.
4. **AI + Human chat parity**
  - AI paperclip always opens sheet (never direct scanner launch).
  - Add Human paperclip with same sheet primitives/components.
  - “My Records” available on all tiers; Camera/Files gated.
5. **Attachment message model**
  - Send structured payload in chat_messages.metadata:
    - recordId, source, label, mimeType, signedUrl/filePath, optional preview fields.
  - Bubble renderer shows a reusable attachment chip in both AI and human conversations.
6. **Focused regression coverage**
  - Milestone non-flight attach renders and persists.
  - From Records includes travel scan + medical scan + transport attachments.
  - AI paperclip opens sheet.
  - Human paperclip exists and can send metadata-backed attachment.

---

## **Implementation risk notes (so this doesn’t regress again)**

- Don’t duplicate logic between Journey and Records; put linking logic in src/lib/records/*.
- Keep upload-sheet UI component shared between AI and Human chat modes.
- Back/close semantics should reuse the same overlay primitive you already planned previously.

---

## **Suggested execution order (minimal risk)**

1. **Canonical key + scope fix** (MilestoneSheet + key helpers).
2. **RelatedDocumentsCard resilience** (event bubbling + preview/picker guards).
3. **AI paperclip routing fix** (open sheet, not scanner).
4. **HumanChatView paperclip + shared sheet integration**.
5. **Attachment metadata rendering in bubbles**.
6. **Focused tests + QA pass**.  
  


## **Acceptance Criteria (must all pass)**

### **1) Journey milestone attachments are scope-correct for all milestone types**

- For a **flight** milestone, attachments save/reload under the same flight scope key (ticket-based).
- For a **non-flight** milestone (appointment/treatment/etc.), attachments save/reload under milestone scope key (not flight-only behavior).
- Reopening the same milestone shows previously linked attachments consistently after refresh.

### **2) “From Records” in RelatedDocumentsCard is no longer incomplete**

- “From Records” lists:
  - transport attachments,
  - scanned travel records,
  - scanned medical records  
  for the same user/device context.
- If a source fetch fails, user gets a toast and the screen does not crash.
- Already-linked records are excluded from picker results (no duplicate link rows for same source object).

### **3) “Apply to milestone” works from Records for both row types**

- For **attachment** rows: action inserts link row and appears in destination milestone card.
- For **scanned-travel** rows: action is enabled, performs import/link flow, and appears in destination milestone card.
- Disabled only for intentionally unsupported origins (e.g., lounge rows if no file/link target exists).

### **4) Milestone key mapping is canonical and shared**

- Journey linking, Records “Apply to milestone,” and Journey “From Records” all use the same mapping helper (single source of truth).
- No divergent ad hoc segment_ref/ticket_id mapping remains in these paths.
- Regression check: same milestone selected from different entry points resolves to identical persisted keys.

### **5) AI chat paperclip behavior is corrected**

- Tapping paperclip in AI chat always opens the attachment sheet first (never directly launches scanner).
- Sheet contains:
  - My Records (available for all tiers),
  - Camera / Files actions (gated by existing plan logic).
- If gated action is tapped on ineligible tier, paywall/upgrade UX appears with correct messaging.

### **6) Human chat has parity attachment entry**

- Human chat composer has paperclip button.
- Paperclip opens same attachment sheet pattern.
- “My Records” selection can send selected record into conversation without manual re-pick.
- Sent item persists as metadata-backed attachment payload and renders visibly as attachment chip in message bubble UI.

### **7) Tier semantics are consistent and non-contradictory**

- “My Records” shows as free/open in UI across FREE/STARTER/COMPANION/FAMILY/guest.
- Camera/Files remain Companion+ gated (or current product policy) with consistent labels and behavior.
- No UI badge/text contradicts attachmentGating policy.

### **8) No crash / no clipping regressions**

- Milestone “From Records” open/close is stable.
- Preview opening is guarded when file path or signed URL fails.
- Attachment tile actions (open/remove/picker) don’t bubble into parent milestone tap handlers.

### **9) Test coverage (focused, required)**

- Unit/integration tests added/updated for:
  - milestone key mapping helper,
  - Journey “From Records” list composition and link flow,
  - Records “Apply to milestone” for scanned-travel and attachment rows,
  - AI paperclip opening sheet,
  - Human chat paperclip presence + metadata-backed send path.
- Existing related tests continue to pass.

### **10) QA checklist pass (manual)**

At mobile viewport:

- Journey milestone → From Records shows real records and links successfully.
- Records → Apply to milestone updates Journey milestone docs.
- AI chat and Human chat both expose attachment sheet.
- My Records works on free tier; Camera/Files gate correctly.
- Refresh app: linked attachments remain visible in correct milestone.