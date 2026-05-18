# Travel Summary v2 — Dates, Counts & Checklist Format

## Goal
Upgrade the text emitted by Copy / Export / Share Travel Docs from a flat dashed list into a structured checklist with per-category counts, total count, generation date, and properly formatted "added" dates per item — in English, Arabic, or Bilingual.

## Current vs. new shape

**Today (per language):**
```
Travel Documents Summary
- Passport scan — passport.pdf — Added 18/05/2026
- ...
```

**New (English example):**
```
Travel Documents Summary
Generated: 18 May 2026
Total: 7 items

Passport (2)
  [x] Passport scan — passport.pdf — Added 18 May 2026
  [x] Iqama front — iqama.jpg — Added 12 May 2026

Visas (1)
  [x] UK visa — visa-uk.pdf — Added 14 May 2026

Bookings (3)
  [x] Hotel London — booking.pdf — Added 14 May 2026
  ...

Other (1)
  [x] Misc — note.pdf — Added 10 May 2026
```

**Arabic mirrors this** with `ملخص وثائق السفر`, `تاريخ الإنشاء`, `الإجمالي`, Arabic category labels (reusing `CAT_DEFS` from `TravelRecordsList`), and `[✓]` checkbox glyph that renders consistently RTL.

**Bilingual** stacks the English block, a separator (`────────`), then the Arabic block, so each side stays readable on its own.

## Format details

- Checklist marker: `[x]` for EN, `[✓]` for AR (avoids mixing Latin "x" inside RTL text). All items are present in the vault so all boxes are checked.
- Category sections only appear if they contain items; counts reflect the **currently visible** filtered list (search + category filter already applied via `visibleTravelDocs`).
- Date formatting:
  - EN: `toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })` → `18 May 2026`
  - AR: `toLocaleDateString("ar-SA", { day: "2-digit", month: "long", year: "numeric" })`
- Header line `Generated:` / `تاريخ الإنشاء:` uses the same formatter with "now".
- Section order matches `CAT_DEFS` order (Passport → Visas → Bookings → Lounge → Insurance → Other) so output is deterministic.
- Indentation is two spaces under each category to give the checklist visual structure in plain-text viewers (WhatsApp, Notes, email).

## Implementation

All work in two existing files. No new files, no backend.

**`src/components/records/TravelRecordsList.tsx`**
- Export the existing `classify` function and `CAT_DEFS` so the summary builder can reuse the exact same buckets the UI shows. Pure refactor — no behaviour change.

**`src/screens/RecordsScreen.tsx`** (`buildTravelSummary`)
- Group `visibleTravelDocs` with the exported `classify` into a `Map<TravelCat, TransportAttachment[]>` while iterating in `CAT_DEFS` order.
- Build EN and AR blocks via small helpers (`renderBlock(lang)`).
- Return EN / AR / EN + separator + AR based on the picked language.
- Export file names stay `travel-documents.txt`, `travel-documents-ar.txt`, `travel-documents-bilingual.txt`.

The language picker sheet, the kebab entries, and the empty-state toast all stay exactly as they are.

## Out of scope
- Translating user-entered `label` / `file_name` (kept verbatim, as before).
- New PDF/HTML export formats — still `.txt`.
- Medical Records summary (separate handler, unchanged).
- Sorting items inside a category beyond the existing visible order.
