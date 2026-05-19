## Canonical UX Unification — PR Slices

**Rule (now in memory):** Lounge/attachment UX uses shared canonical components only. No section-local variants. No mirrored lookalikes. True reuse only.

---

### Slice 1 — Shared overlay primitive

Create `src/shared/ui/OverlayLayer.tsx` + `useOverlayBack.ts`:

- Portal mount to `document.body`
- Standard z-index tokens in `index.css` (`--z-overlay-sheet`, `--z-overlay-preview`, `--z-overlay-picker`) above milestone sheets and bottom nav
- Unified close contract: backdrop tap, X button, hardware/browser back (popstate)
- Safe-area padding, body-scroll lock
- Acceptance: any consumer gets identical layering/back behavior with zero per-call config.

### Slice 2 — UnifiedAttachmentPreview

Extract Journey's preview into `src/shared/ui/UnifiedAttachmentPreview.tsx`:

- Full-screen dark modal, file header (title + filename), X close
- Shared action row (open/share/download/rename/delete via props)
- Renders via `UniversalDocumentPreview` (PDF/image/Office)
- Optional `keyFields` slot for visa/passport metadata
- **Wire Journey first** (`RelatedDocumentsCard`), then **migrate Records** (`TravelRecordsList`, `TravelScannedRecordViewer`) to consume it. Delete the Records-local preview JSX in the same slice.

### Slice 3 — UnifiedLounge components

Extract Journey's lounge UX into `src/shared/ui/UnifiedLoungeCard.tsx` + `UnifiedLoungeSheet.tsx`:

- Same card visuals/hierarchy, QR panel, full-screen scan flow, upload/edit/download/share actions, metadata states
- **Wire Journey** (keep `LoungeAccessSection` as the canonical owner, export shared pieces), then **migrate Records** lounge to consume them. Remove the Records lounge inline path.

### Slice 4 — Scanner embedded layout normalization

`ScannerWizard`: ensure portal + `fixed inset-0` + safe-area + internal scroll work identically from every entry point (Journey milestone, Records, milestone sheets). Reuse Slice 1 primitive for child modals.

### Slice 5 — Cleanup, parity tests, QA checklist

- Remove dead section-specific preview/lounge code paths
- Add parity tests: same component renders from Journey and Records entry points; portal mounted to body; popstate closes overlay; PDF + image render identically
- Add `docs/qa/canonical-ux-parity.md` checklist (no clipped overlays, identical lounge in both sections, identical preview in both sections, back/close from every entry point)

---

### Acceptance criteria (all slices)

- Journey and Records attachment preview match behaviorally **and** visually (same component instance).
- Records lounge card/sheet rendered by the same component used in Journey.
- No remaining section-local preview/lounge variants in the repo (grep clean).
- All overlays go through the Slice 1 primitive.

### Recommended Enhancements

### **1) Add a hard “no direct modal markup” guard**

In addition to “all overlays go through Slice 1 primitive,” add:

- ESLint rule or code-review grep gate for:
  - className="fixed inset-0" in non-shared overlay files
  - createPortal( outside approved shared overlay utilities

This prevents reintroducing section-local modals later.

---

### **2) Expand UnifiedAttachmentPreview data contract now**

Define one interface up front (avoid retrofitting later), including:

- mimeType, fileName, title, signedUrl/localUrl
- keyFields
- optional actions with capability flags (canRename, canDelete, etc.)
- callbacks for open/share/download/rename/delete
- onClose

This keeps Journey/Records from diverging due to prop mismatch.

---

### **3) Include focus trap + escape key in Slice 1 acceptance**

Overlay primitive should guarantee:

- focus trap
- initial focus on close button
- Esc closes
- return focus to opener

You already have back handling; accessibility/input consistency should be part of canonical behavior.

---

### **4) Add deterministic z-index scale in CSS tokens**

Don’t only define tokens — define order contract in docs:

picker < sheet < preview < scanner-critical (or your chosen hierarchy)

And assert via visual test/checklist.

---

### **5) Add migration safety for old callers**

For RelatedDocumentsCard, TravelRecordsList, and lounge consumers:

- keep temporary adapter wrappers for one slice
- then remove wrappers in Slice 5 cleanup

This reduces break risk while wiring old callsites.

---

### **6) Strengthen “grep clean” acceptance**

Make it explicit:

- no section-local preview/lounge components remain **except** thin adapters that only pass props into shared canonical components
- adapters removed by end of Slice 5

### Technical notes

- Files touched per slice are scoped — no cross-slice edits.
- Each slice is independently shippable; no slice leaves the app in a broken state.
- `LoungeQrSheet` (already exported) becomes part of Slice 3's shared module.