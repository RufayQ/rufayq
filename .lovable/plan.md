# Plan — QC Smoke Report Upload with Attachments

The auto-parse + Case 1–6 classification already exists in `AdminQcSmoke.tsx` (drop / pick → `parseSmokeReport` → verdict badge + Case label + sub-tags). What's missing is the **attachments** half of "smoke report upload + auto-parse" — secondary files (screenshots, raw `logcat.txt`, APK profile dumps) uploaded alongside the report and carried into the saved run and any bug created from it.

## 1. DB migration — add `attachment_paths` to `qc_test_runs`

`qc_bugs` already has `screenshot_paths text[]`. Mirror it on runs:

```sql
ALTER TABLE public.qc_test_runs
  ADD COLUMN IF NOT EXISTS attachment_paths text[] NOT NULL DEFAULT '{}';
```

No new RLS — existing run policies cover the column.

## 2. `AdminQcSmoke.tsx` — attachments UI

Add state + UI directly above the Save/Bug buttons. No new component files.

- **State:** `const [attachments, setAttachments] = useState<File[]>([]);` and `const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);`
- **Picker:** secondary `<input type="file" multiple>` accepting `image/*,.txt,.log` with a small drop zone labelled "Attach screenshots, raw logcat, or profile dumps (optional)". Show selected file names as chips with remove buttons.
- **Upload on save:** before inserting `qc_test_runs`, upload each `File` to bucket `qc-attachments` under path `runs/<reporter_id>/<timestamp>-<safe-filename>` using `supabase.storage.from("qc-attachments").upload(...)`. Collect returned paths into `uploadedPaths`. Include them in the insert payload as `attachment_paths`.
- **Failure handling:** if any upload fails, toast the error and abort the save — do not insert a half-attached run. Already-uploaded paths from the same attempt are not cleaned up (acceptable; orphans stay in the private bucket and can be GC'd later).
- **Display after save:** show the saved attachment list with signed-URL "View" links generated via `supabase.storage.from("qc-attachments").createSignedUrl(path, 3600)` on click (lazy, per item).
- **Carry-through to bug:** when `createBugFromRun` runs, also pass `screenshot_paths: uploadedPaths.filter(p => /\.(png|jpe?g|webp|gif)$/i.test(p))` so screenshots show up on the bug.
- **Reset:** clear `attachments` and `uploadedPaths` in `reset()`.

## 3. Verdict / Case panel — minor reinforcement

The Case 1–6 result panel already exists. Two small tweaks for clarity:
- Add a one-line description under the Case label pulled from `caseLabels[caseCode]` in `parseSmokeReport.ts` when `parsed.caseLabel` is empty (defensive — parser may miss the dash separator on edge formats).
- Add an "auto-classified" `[10px]` muted hint next to the Case pill so testers know the value came from the parser, not manual entry.

## Out of scope
- No changes to `AdminQcBugs`, `AdminQcRuns`, `AdminQcValidations`, `AdminQcCrashEvents`.
- No changes to bash smoke-report script or `parseSmokeReport.ts` logic.
- No new bucket — reuses existing `qc-attachments` with its existing RLS.
- No virus scan, no thumbnail generation, no per-attachment metadata table.
