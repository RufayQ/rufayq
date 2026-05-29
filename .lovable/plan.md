# Plan — Boarding-pass UX polish + upload validation

## 1) Unified source chooser when attaching a boarding pass

Today, tapping the inline **Attach boarding pass — {Traveler}** tile in `RelatedDocumentsCard.tsx` immediately opens the OS file picker. We will instead open a small bottom-sheet ("How would you like to add this?") with three options, matching the conventions already used elsewhere in the app:

1. **From My Records** → opens `UnifiedRecordsPicker` (same component currently behind the "From Records" tile).
2. **Upload from Device** → triggers the existing hidden `<input type="file">` (image / PDF / doc).
3. **Scan with Camera** → triggers a separate hidden `<input type="file" accept="image/*" capture="environment">` so Android/iOS open the camera directly; the captured photo then flows into the existing `ScannerWizard` (same review/crop/key-fields step).

Sheet styling will reuse the existing `OverlayLayer` "sheet" layer and the same visual language as the current "Label this document" sheet (gold accents, rounded-top, btn-press). EN + AR labels.

Scope of reuse: we **don't** rebuild the ScannerWizard's own internal source step. The new sheet sits **in front of** the per-traveler slot tile only, since the slot needs the extra "From Records" entry the wizard doesn't expose. The generic `Attach` and `From Records` tiles keep their current single-tap behaviour (no regression for non-slot uploads).

Behaviour preserved:
- Selected source still goes through the existing `Label this document` sheet for non-image files, or the `ScannerWizard` for image/PDF, so labelling + key-fields capture is unchanged.
- `activeSlot` continues to route the upload under the slot's `segmentRef` and pre-selects the `Boarding Pass` subcategory.

## 2) Fix "From Records" routing for slot tiles

`linkExisting()` currently hard-codes the parent card's `segmentRef`/`ticketId`, so picking a record from the per-traveler slot would attach to the wrong scope. We will:
- Capture `activeSlot` when the user enters the chooser from a slot tile.
- Pass `activeSlot?.segmentRef ?? segmentRef` into `linkRecordToMilestone(...)` so the linked record lands under the traveler's slot and disappears from the slot empty-state on refresh.
- Clear `activeSlot` after success/cancel.

## 3) Raise the helicopter "NEXT · التالي" badge

In `src/components/journey/HelicopterCanvas.tsx` (lines ~263–296) the `helicopter-now-flag` sits at `bottom: calc(100% + 4px)` and overlaps the station circle (visible in the screenshot). We will:
- Increase the offset to `calc(100% + 12px)`.
- Add a tiny `marginBottom: 2` on the pointer arrow so the tail no longer punches into the medallion.

No change to copy or other timeline screens; the `HelicopterTimelineRail.tsx` "NEXT · التالي" already sits above the rail with clearance.

## 4) Validate + test the upload process

Manual + automated checks to add/run:

- **Manual smoke on the Return Home milestone** (the screenshot's case):
  - Tap boarding-pass slot → chooser appears with 3 options.
  - From Records → pick an existing IQAMA/boarding scan → slot tile disappears, file appears in the strip with traveler's name as label.
  - Upload from Device → image flows into ScannerWizard, save → row inserted with `subcategory = "Boarding Pass"` and `segment_ref = slot.segmentRef`.
  - Scan with Camera → camera opens on Android (capture attr), capture → same ScannerWizard flow.
  - Error paths: oversized file (>10MB) still shows the existing toast; cancel from any step rolls back `activeSlot`.

- **Automated test additions:**
  - Extend `src/components/journey/__tests__/MilestoneSheet.test.tsx` with a case that taps `[data-testid="related-docs-slot-tile"]`, asserts the new chooser sheet renders three buttons, and that the "From Records" button opens `UnifiedRecordsPicker`.
  - New test in `RelatedDocumentsCard` (or extend existing) that mocks `linkRecordToMilestone` and verifies the slot path passes `segmentRef = slot.segmentRef` (not the parent card's).
  - Existing thumbnail and upload tests remain untouched.

## Files to touch

- `src/components/RelatedDocumentsCard.tsx` — new source-chooser sheet, camera input, slot-aware `linkExisting`.
- `src/components/journey/HelicopterCanvas.tsx` — raise NEXT badge offset.
- `src/components/journey/__tests__/MilestoneSheet.test.tsx` — chooser-flow test.
- (Optional) small test for slot-aware From Records routing.

No DB, RLS, edge function, or schema changes.
