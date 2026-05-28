# Canonical UX Parity Checklist

The lounge, attachment preview, picker, and scanner overlays MUST behave and
look identical regardless of which screen opens them. This checklist is the
authoritative manual QA pass run before any release that touches overlays,
shared UI, Journey, Records, or the scanner.

## Architectural rule (also enforced by ESLint)

- All full-screen / floating overlays are mounted via
  `OverlayLayer` from `@/shared/ui/overlay`.
- Raw `className="fixed inset-0"` overlay markup and direct `createPortal`
  calls are forbidden outside `src/shared/ui/overlay/`.
- Z-index layering follows the deterministic scale in `src/index.css`:
  `picker (1280) < sheet (1300) < preview (1320) < scanner (1400)`.

If the ESLint guard fires, fix the call site — do not add a per-file disable.

---

## QC Admin board — automated regression coverage (endorsed)

The following automated specs are part of the pre-release QC board. Each row
must be green on `bun run test` before sign-off; the QC admin records the
latest run in the release ticket.

| Area | Spec | Endorsement |
|------|------|-------------|
| "Tap for details" — flight / train / taxi (car) / rental | `src/components/__tests__/TransportCard.tapForDetails.test.tsx` | ✅ Endorsed — covers all 4 transport variants firing `onTap` |
| Milestone expand / collapse — flight, appointment, treatment, return | `src/components/journey/__tests__/MilestoneSheet.test.tsx` | ✅ Endorsed — `it.each` over every milestone kind |
| Replicated trip — date validation gate | `src/components/__tests__/EditTransportSheet.replicate.test.tsx` | ✅ Endorsed — Save disabled + inline error when date unchanged / missing |
| Per-traveler boarding-pass empty hint | `src/components/journey/__tests__/MilestoneSheet.test.tsx` (`forwards emptyHint`) | ✅ Endorsed — guides upload when no boarding pass exists |

QC admin sign-off: update the release runbook row "Journey milestone E2E"
to `PASS` once the four specs above run green in CI.

### Failure-artifact capture & QC portal upload

The two tap-for-details specs above wrap each variant with
`withQcArtifacts(<milestone>, …)` from `src/test/qcArtifacts.ts`. On failure
(or when `QC_ARTIFACTS_ALWAYS=1` is set) the helper writes:

- `test-artifacts/qc/<milestone>/<test>-fail-<ts>.html` — full DOM snapshot of
  the expanded panel for debugging
- `test-artifacts/qc/<milestone>/<test>-fail-<ts>.svg` — inline-previewable
  screenshot wrapper of the same DOM
- `test-artifacts/qc/manifest.jsonl` — one JSON line per dumped test

CI then runs `node scripts/qa/upload-qc-artifacts.mjs` (requires
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). The script uploads every
artifact to the **`qc-attachments`** bucket under
`e2e/<milestone-category>/<ts>/…` and inserts a `qc_test_runs` row with:

- `scenario`: `Tap-for-details · <category> · <test name>`
- `case_subtags`: `['e2e','tap-for-details','<category>']`
- `screenshot_paths`: the uploaded storage paths

Milestone categories supported out of the box: `flight`, `train`, `taxi`,
`rental`, `appointment`, `treatment`, `return` (transport variants are
recorded after stripping the `transport-` prefix). New categories only
require passing a new milestone slug to `withQcArtifacts`.


---



## 1. Attachment preview parity (Journey ↔ Records)

Open the same attachment from a Journey milestone and from the Records list.

- [ ] Same component instance (`UnifiedAttachmentPreview`) — visual diff is
      zero across header, file metadata, action row, and extracted-fields
      panel.
- [ ] Overlay is mounted directly under `<body>` (DOM inspector: not nested
      inside any milestone card / list item).
- [ ] Backdrop is full-bleed black (`bg-black/90`), no clipping from parent
      `overflow:hidden` or `transform`.
- [ ] X button closes the overlay and restores focus to the trigger.
- [ ] Hardware/browser back button (popstate) closes the overlay without
      navigating off the screen.
- [ ] Escape key closes the overlay.
- [ ] Body scroll is locked while open and restored on close.
- [ ] PDF attachments render via `UniversalDocumentPreview` (page nav works).
- [ ] Image attachments render full-bleed with `object-contain`.
- [ ] Rename / Share / Open actions appear identically in both sections when
      the consumer enables them.

## 2. Lounge card + QR sheet parity (Journey ↔ Records)

Add a lounge card in Journey → open its QR. Repeat from Records.

- [ ] Card UI is identical (same `LoungeAccessSection` render path).
- [ ] Tapping a card opens `LoungeQrSheet` — same bottom-sheet visuals,
      same `OverlayLayer` sheet layer.
- [ ] Fullscreen QR opens via `OverlayLayer` scanner layer (white backdrop,
      QR maximally sized, brightness boost applied).
- [ ] Download / Share / Exit-fullscreen buttons identical in both entry
      points. `data-testid` hooks (`qr-fullscreen`, `qr-fullscreen-download`,
      `qr-fullscreen-share`) still resolve.
- [ ] Back button exits fullscreen QR (not the entire screen).
- [ ] Edit pencil in the sheet opens `LoungeFormSheet` (Journey only) or
      closes the sheet (Records).

## 3. Picker parity ("From Records" / label sheet)

- [ ] Both pickers mount via `OverlayLayer` (picker layer, z 1280).
- [ ] Tap-on-backdrop closes; X button closes; Escape closes; back button
      closes.
- [ ] No visual clipping when triggered from inside a milestone card.

## 4. Scanner overlay parity

Launch the scanner from every entry point (Home FAB, Journey milestone,
Records, milestone "From scan" path).

- [ ] Scanner opens via `OverlayLayer` (scanner layer, z 1400) — covers
      bottom nav and any sheets behind it.
- [ ] `closeOnBackdrop` is disabled — accidental backdrop taps do not
      destroy in-progress capture.
- [ ] Hardware back / Escape closes the wizard cleanly without leaving
      orphan portal nodes (inspect `<body>` after close).
- [ ] Internal sheets opened from inside the scanner (category picker,
      preview confirm) use `OverlayLayer` and sit above the scanner via
      their own layer tokens.
- [ ] Safe-area insets respected on iOS notch / Android gesture bar.

## 5. Regression sweep

Run before merging any overlay-related change:

```sh
bun test -- src/shared/ui/attachments
bun test -- src/components/lounge
bun test -- src/screens/__tests__/ScannerWizard
bun lint
```

- [ ] All shared-overlay parity tests green.
- [ ] ESLint reports no `no-restricted-syntax` violations against
      `createPortal` or `fixed inset-0`.
- [ ] No leftover `z-[1100]` / `z-[1200]` / `z-50` magic numbers in section
      components (grep clean):

```sh
rg -n "fixed inset-0|createPortal|z-\\[1[0-4]00\\]" src --glob '!src/shared/ui/overlay/**' --glob '!**/__tests__/**'
```

## 6. Sign-off

| Section            | Pass | Tester | Date |
| ------------------ | ---- | ------ | ---- |
| Attachment preview |      |        |      |
| Lounge card + QR   |      |        |      |
| Picker             |      |        |      |
| Scanner            |      |        |      |
| Regression sweep   |      |        |      |
