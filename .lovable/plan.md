
## Goals

Address 5 related issues around scanning and document upload:

1. Visa-specific key fields (visa no, passport no, iqama no, holder, exit/return dates).
2. Two parallel upload flows producing different UX (scanner ↔ flight-ticket attachment).
3. Crop tool currently zooms instead of cropping.
4. Visa appears as two rows (one with preview/no fields, one with fields/no preview).
5. PDF preview UX inside the scanned-record viewer.

## Scope of changes (frontend only)

### 1. Visa-specific schema in scanner

`src/screens/ScannerWizard.tsx`
- Replace flat `legal` schema with a per-subcategory map. When `subcategory === "Visa"` use:
  `Visa number, Passport number, Iqama number, Visa holder, Nationality, Issue date, Exit before, Return before`.
  Keep current generic legal schema as fallback for Passport / National ID / Residency.
- Wire `Step4AIReview` to pick the schema using `(category, subcategory)` rather than category only.

### 2. Unified upload experience

Today:
- `RelatedDocumentsCard` (used from flight-ticket detail) uploads raw file → `transport_attachments` + storage. No image edits, no extracted fields.
- `ScannerWizard` (FAB / Records "Scan" CTA) has edits + fields but persists to localStorage only.

Change: route both through the scanner's "review + fields" stage while keeping ticket linkage.

- `RelatedDocumentsCard`: when user picks a file, open `ScannerWizard` pre-seeded with the file, a default category (`legal` for ticket-linked attachments, configurable), and an `onSave` callback that:
  - uploads the rasterised first page (image) or original PDF to `transport-attachments` bucket,
  - inserts a `transport_attachments` row including the new `key_fields` JSON and `subcategory` (added in the next bullet).
- Add an optional `initialFile` + `attachContext` (ticket id, category) prop to `ScannerWizard`; skip Step 1 (capture) and Step 2 (category) when provided.

### 3. Real crop tool

`src/screens/ScannerWizard.tsx` Step 3 editor (lines ~580–730):
- Replace `padding: ${cropPct}%` (which shrinks the visible image — looks like a zoom-out) with an actual crop preview using `clip-path: inset(<pct>% <pct>% <pct>% <pct>%)` on the `<img>` and scaling its parent to the cropped area, so the user sees the trimmed region only.
- Upgrade the cycling button into a slider/drag-handle crop: 4 corner handles for free crop (state `{ top, right, bottom, left }` as percents 0–40). Persist to canvas using existing `sx/sy/sw/sh` math.
- Keep "Reset" wiring.

### 4. De-duplicate visa rows

Root cause: scanner stores in `travelScannedRecordsStore` (localStorage) AND a separate user upload via `RelatedDocumentsCard` stores in `transport_attachments`. The Travel Records list merges both → duplicate.

Fix (depends on §2): make the scanner the single writer. Concretely:

- In `handleScannerSave` (`src/pages/Index.tsx`), for `category === "legal"` write to `transport_attachments` (image of page 1 + extracted JSON in a new `key_fields jsonb` column on `transport_attachments`) instead of the local store, when auth is available. Fall back to local store only for guest mode.
- Remove duplicate `scanned-travel` rows when an attachment with the same filename + similar created_at exists in the merge in `TravelRecordsList` (defensive client-side dedupe).
- Migration: add nullable `key_fields jsonb` and `subcategory text` to `transport_attachments`. (DB change is required for §2 to surface fields.)

### 5. PDF preview UX

`src/components/records/TravelScannedRecordViewer.tsx`
- When `pageImages` is empty but the source is a PDF stored in `transport_attachments`, render an `<iframe>` of the signed URL (matches `TravelRecordsList` attachment preview style) with the same fullscreen toggle.
- For local-only scanner records that lack `pageImages` (old data), generate the first-page thumbnail on the fly via existing `src/lib/pdfToImages.ts` when the user opens the viewer, and cache it back into the record.
- Tighten layout: image area uses `flex-1` instead of fixed 55dvh so the preview fills available space; details collapse into a bottom sheet on small viewports.

## Files touched

- `src/screens/ScannerWizard.tsx` — visa schema, real crop, optional initial file/context.
- `src/components/RelatedDocumentsCard.tsx` — open scanner instead of plain upload; on save, upload + insert with `key_fields` and `subcategory`.
- `src/pages/Index.tsx` — `handleScannerSave` writes legal docs to `transport_attachments`; keeps local fallback for guests.
- `src/components/records/TravelRecordsList.tsx` — client-side dedupe; pass `key_fields` from attachments to the viewer.
- `src/components/records/TravelScannedRecordViewer.tsx` — PDF iframe fallback, on-demand thumbnail, flex layout.
- `src/lib/travelScannedRecordsStore.ts` — keep, used only for guest mode.

## DB migration

- `alter table transport_attachments add column key_fields jsonb`, `add column subcategory text`. No backfill needed.

## Out of scope

- No backend logic changes beyond the additive columns.
- No changes to medical records flow.
