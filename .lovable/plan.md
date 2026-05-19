## Issues & root-cause analysis

### 1. Attach on flight tickets is broken
`RelatedDocumentsCard.onPickFile` now routes every image/PDF into `ScannerWizard` with `preselectedCategory="legal"`, `preselectedSubcategory={LABEL_TO_SUBCATEGORY[labelDraft] || "Visa"}`. `labelDraft` defaults to `"VISA"` and is never re-set before the file picker fires, so a flight-ticket attachment is forced through the Visa schema and saved with no chance to label it correctly. Also, the user never gets a chance to choose what kind of document they're attaching (VISA / Passport / Insurance / Hotel / Other) before the scanner takes over — which makes the flow feel "broken" because the Attach button no longer leads to a labeled upload.

**Fix:** Show the label sheet first for every file (image / PDF / office) so the user picks `VISA / Passport / Insurance / Hotel / Other / custom`, then route to the scanner if it's an image/PDF using the chosen subcategory, or keep the lightweight upload path otherwise. Image/PDF uploads still get the full review-and-key-fields experience, just under the correct subcategory.

### 2. Visa preview after upload
The scanner already produces `pageImages` and (post-recent change) `fileUrl` + `mimeType`. The Step-4 "Extracted Information" card for non-flight documents only shows the AI hint + manual fields — there is no visible preview of the uploaded VISA itself. Inside the scanner wizard we'll add a compact preview strip above the manual fields using `UniversalDocumentPreview` (image / PDF / Word fallback) sourced from `analyzedImages[0]` or the underlying `realFile` (via `URL.createObjectURL`). Multi-page PDFs use the existing page nav.

### 3. Visa fields need typed inputs
Currently the Visa schema uses generic free-text `EditableField` rows. We'll specialize the rendering for the Visa subcategory only:
- **Nationality** → dropdown bound to `COUNTRIES` from `src/data/countries.ts` (bilingual labels, Saudi-first ordering preserved).
- **Iqama expiry**, **Exit before**, **Return before** → `<input type="date">` with a small calendar affordance, ISO `YYYY-MM-DD` stored as the field value (so existing persistence + the visa e2e test continue to pass).

The schema (`SCHEMA_BY_SUBCATEGORY.legal.Visa`) gets a `kind` hint per field (`"text" | "date" | "country"`) and `EditableField` is extended to render the right control based on that hint. All other subcategories keep the existing free-text behavior — no regressions.

## Files to touch

- `src/components/RelatedDocumentsCard.tsx`
  - `onPickFile`: always open the label sheet first; after `Attach`, branch to scanner (image/PDF) with the chosen subcategory, or upload directly (office/other).
  - Pass `LABEL_TO_SUBCATEGORY[labelDraft]` to `ScannerWizard` at scan-launch time, not at render time.
- `src/screens/ScannerWizard.tsx`
  - Extend `SCHEMA_BY_SUBCATEGORY.legal.Visa` entries with `kind` ("text" | "date" | "country").
  - Extend `EditableField` (or wrap it) to render `<input type="date">` for date kinds and a searchable native `<select>` of `COUNTRIES` for country kind.
  - In Step-4 success view, render a preview strip above the "Extracted Information" card for non-flight categories using `UniversalDocumentPreview` sourced from `analyzedImages` / `realFile` (object URL).
- No DB changes — values still stored as strings in `manualFields` / `key_fields`.

## Technical notes

- `EditableField` API stays `{ label, value, onChange }`; we'll add an optional `kind` plus `options` (for country) so the visa fields keep using the same change pipeline (`setGenericFields`).
- For the country control, value persisted is the country `name` (English) so it round-trips cleanly with existing `key_fields` rows; the dropdown shows `Name · العربية`.
- Date inputs use a controlled string in `YYYY-MM-DD`. `fmtDateLite` already handles either ISO or pre-formatted strings on display, so the existing record viewer keeps working.
- Preview strip respects `attachmentMode` (scanner launched from RelatedDocumentsCard) — same code path, no extra plumbing.

## Out of scope

- No backend / RLS changes.
- No changes to `RelatedDocumentsCard` preview modal (already uses `UniversalDocumentPreview`).
- No new dependencies.
