# Travel Docs Preview Step

## Goal
Before any Copy / Export / Share runs, show a quick review of the documents that will be included so I can confirm or cancel.

## Flow

```
kebab → [Preview sheet] → Continue → [Language sheet] → action runs
                       ↘ Cancel/close
```

The Preview sheet is the new first step. The existing `TravelSummaryLanguageSheet` is unchanged and still the second step.

## New component
`src/components/records/TravelDocsPreviewSheet.tsx` — bottom sheet, same shell/tokens as `TravelSummaryLanguageSheet` (390px, rounded-t-3xl, dark-mode safe).

Contents:
- Header chip: `REVIEW · مراجعة` + action title in EN/AR (reuses an `ACTION_LABEL` map matching the language sheet).
- Total count line: `7 items will be included · سيتم تضمين ٧ عناصر` (Arabic numerals via `toLocaleString("ar-EG")`).
- Empty-state: `No travel documents to include · لا توجد وثائق سفر` with only a Close button (Continue disabled). This matches the existing empty-state toast guard but keeps the user inside the sheet for clarity.
- Grouped scrollable list (`max-h-[55vh] overflow-y-auto`) using the exported `CAT_DEFS` / `classify` from `TravelRecordsList`:
  - Section heading per non-empty category: `Passport (2) · جواز`
  - Rows: small file icon, label, file name muted, `Added <date>` in EN-GB short format. Two-line layout, no thumbnails (keeps it light, no Supabase round-trips).
- Footer: `Continue · متابعة` primary button (teal) + `Cancel · إلغاء` ghost button.

Props:
```ts
{
  open: boolean;
  action: "copy" | "export" | "share" | null;
  docs: TransportAttachment[];
  onClose: () => void;
  onContinue: () => void;
}
```

No data fetching inside — it just renders the `visibleTravelDocs` array passed in.

## `src/screens/RecordsScreen.tsx`
- Add state: `travelPreviewAction: "copy" | "export" | "share" | null`.
- `recordsMenuItems` for the travel segment now sets `travelPreviewAction` instead of `travelAction`. The empty-state toast guard moves into the preview sheet itself (so the user sees *why* nothing happens).
- Render `<TravelDocsPreviewSheet open={!!travelPreviewAction} action={travelPreviewAction} docs={visibleTravelDocs} onClose={…} onContinue={…} />`.
- `onContinue` closes the preview and opens the existing language sheet by setting `travelAction = travelPreviewAction`.
- Language sheet, `buildTravelSummary`, and `runTravelAction` are untouched.

## Out of scope
- Per-item include/exclude checkboxes (preview only).
- Thumbnails / signed-URL previews of the files.
- Medical Records summary (no preview added there).
- Any change to the summary format itself.
