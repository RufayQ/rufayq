# Travel Summary — Language Option for Share & Export

## Goal
Today the Travel tab's kebab has fixed "Copy / Export / Share Travel Docs" actions that always emit the same bilingual-header + English-body summary. Users want to pick the language of the summary (Arabic, English, or both) when they share or export it.

## Approach
Add a lightweight **language picker bottom sheet** that opens when the user taps Copy / Export / Share Travel Docs in the Records kebab. Keep the kebab compact instead of tripling its entries.

All work stays in `src/screens/RecordsScreen.tsx` plus one small new presentational component.

## UX

1. User opens Records → Travel → kebab → "Copy / Export / Share Travel Docs".
2. A bottom sheet slides up titled **"Summary language · لغة الملخص"** with three pill options:
   - **English** · الإنجليزية
   - **العربية** · Arabic
   - **Bilingual** · ثنائي اللغة (default highlighted)
3. Picking an option immediately runs the original action (copy / download / share) with the summary rendered in that language, then closes the sheet.
4. Toast confirms in the same bilingual style already used elsewhere.

The sheet uses the existing teal/gold tokens, the 390 px mobile shell width, and respects dark mode. No new dependencies.

## Summary content per language

`buildTravelSummary(lang)` returns:

- **en**
  ```
  Travel Documents Summary

  - {label} — {file_name} — Added {date}
  ```
- **ar** (wrapped `dir="rtl"` only matters for share targets that honor it; the text itself is Arabic)
  ```
  ملخص وثائق السفر

  - {label} — {file_name} — أُضيفت {date-ar}
  ```
  Dates formatted with `toLocaleDateString("ar")`. Document `label` / `file_name` are user-entered free text and stay as-is in both languages (we do not translate user content).
- **both** (current behaviour, preserved as default)
  ```
  Travel Documents Summary
  ملخص وثائق السفر

  - {label} — {file_name} — Added {en-date} · أُضيفت {ar-date}
  ```

Export filename varies: `travel-documents.txt`, `travel-documents-ar.txt`, `travel-documents-bilingual.txt`.

Share sheet `title` also switches: `Travel Documents` / `وثائق السفر` / `Travel Documents · وثائق السفر`.

## Implementation

**New component** `src/components/records/TravelSummaryLanguageSheet.tsx`
- Props: `open`, `onClose`, `onPick(lang: "en" | "ar" | "both")`.
- Fixed-position overlay + bottom card, three pill buttons, cancel chip. Pure presentational, no state outside `open`.

**`src/screens/RecordsScreen.tsx`**
- Add state: `travelAction: null | "copy" | "export" | "share"`.
- Refactor `buildTravelSummary` to accept `lang` and produce the three variants above.
- Refactor `handleCopyTravelDocs`, `handleExportTravelDocs`, `handleShareTravelDocs` into a single `runTravelAction(action, lang)` helper; the existing menu handlers now just set `travelAction` to open the sheet (after the empty-state toast guard).
- Render `<TravelSummaryLanguageSheet open={!!travelAction} onClose={() => setTravelAction(null)} onPick={(lang) => { runTravelAction(travelAction!, lang); setTravelAction(null); }} />`.

No backend, database, hook, or other screen is touched. The Medical-tab kebab actions are unchanged.

## Out of scope
- Translating user-entered document labels / filenames.
- Language picker for the Medical Records summary (can be added later with the same pattern if requested).
- PDF/HTML export formats — still plain `.txt`.
