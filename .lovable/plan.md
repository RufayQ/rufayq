Please implement the Records → Travel tab header/menu polish.

Goal:

Bring the Records → Travel tab header kebab in line with the rest of the app, and make the header tighter by turning the `＋ Scan` pill into an icon-only circular scan button.

Scope:

- UI/action polish only.

- No backend changes.

- No migrations.

- No changes to HeaderMenu.tsx.

- No changes to RecordActionsSheet behavior.

- No changes to Medical tab menu behavior except preserving existing behavior.

- Keep Travel row-level kebab unchanged.

Files to touch:

1. `src/screens/RecordsScreen.tsx`

2. `src/components/records/TravelRecordsList.tsx`

Reason for touching `TravelRecordsList.tsx`:

`RecordsScreen` does not currently own the Travel rows. The Travel list fetches and filters rows internally, so to copy/export the visible Travel rows without a new query, `TravelRecordsList` must expose its current visible rows to `RecordsScreen` through a small callback prop.

---

## 1. Convert `＋ Scan` pill into icon-only circular button

In `src/screens/RecordsScreen.tsx`, header row currently renders a gold text pill.

Replace it with a compact circular icon button:

Requirements:

- Use existing `ScanLine` icon.

- `className` should match the circular footprint used by app header buttons:

  `w-9 h-9 rounded-full flex items-center justify-center btn-press`

- Use gold background:

  `background: "var(--gold)"`

- Use navy icon stroke:

  `color="var(--navy)"` or style equivalent.

- Add:

  `aria-label="Scan document · مسح وثيقة"`

- Add:

  `title="Scan document · مسح وثيقة"`

- Keep the action:

  `onClick={() => onOpenScanner?.()}`

Expected visual result:

Header action buttons become same-sized circular controls:

`[Scan icon] [HeaderMenu/kebab]`

If a notification/bell button exists in this header in the current branch, it should also remain visually aligned as `[Scan] [Bell] [⋮]`.

Do not change `HeaderMenu.tsx`.

---

## 2. Expand Travel kebab menu

In `src/screens/RecordsScreen.tsx`, keep Medical branch unchanged.

Update the Travel branch of `recordsMenuItems` to this order:

1. `Scan Travel Document`

   - icon: `ScanLine`

   - Arabic: `مسح وثيقة سفر`

   - action: `onOpenScanner?.()`

2. `Copy Travel Summary`

   - icon: `Copy`

   - Arabic: `نسخ ملخص السفر`

   - action: new `handleCopyTravelDocs`

3. `Export Travel Docs (.txt)`

   - icon: `Download`

   - Arabic: `تصدير وثائق السفر`

   - action: new `handleExportTravelDocs`

4. `Share Travel Docs`

   - icon: `Share2`

   - Arabic: `مشاركة وثائق السفر`

   - action: existing share behavior may stay, but prefer Travel-specific text if practical.

Do not modify Medical menu labels/actions.

---

## 3. Expose visible Travel rows from `TravelRecordsList`

In `src/components/records/TravelRecordsList.tsx`, add an optional prop:

```ts

onVisibleItemsChange?: (items: TransportAttachment[]) => void;

After filtered is computed, call the callback when visible rows change:

`useEffect(() => {`  
  `onVisibleItemsChange?.(filtered);`  
`}, [filtered, onVisibleItemsChange]);`  


Important:

- Avoid infinite loops.
- If needed, memoize filtered with useMemo before using it in the effect.
- The callback should reflect the same visible list the user sees after:
  - Travel category chip filter,
  - search query,
  - deletions/renames/refetches.

In RecordsScreen.tsx, add state:

`const [visibleTravelDocs, setVisibleTravelDocs] = useState<TransportAttachment[]>([]);`  


Import the type:

`import type { TransportAttachment } from "@/components/RelatedDocumentsCard";`  


Pass callback:

`<TravelRecordsList`  
  `userId={userId}`  
  `searchQuery={searchQuery}`  
  `onVisibleItemsChange={setVisibleTravelDocs}`  
`/>`  


This avoids a new query and uses the Travel tab’s current visible data.

---

## **4. Add Travel copy/export handlers**

In src/screens/RecordsScreen.tsx, add two handlers near the existing medical handlers.

### **Empty state**

If visibleTravelDocs.length === 0, both handlers should:

`toast.info("No travel documents yet · لا توجد وثائق سفر بعد", { duration: 2000 });`  
`return;`  


Do not write files or clipboard content when empty.

### **Summary formatter**

Create a small formatter helper for Travel rows.

Use fields available on TransportAttachment:

- label
- file_name
- created_at
- mime_type
- size_bytes

Suggested line format:

`- <label> — <file_name> — Added <date>`  


If you want category, reuse a local lightweight classifier or import/reuse the existing Travel classifier only if it is exported safely. Do not duplicate complex logic unnecessarily.

Suggested bilingual header:

`Travel Documents Summary`  
`ملخص وثائق السفر`  
  
`<lines>`  


### **handleCopyTravelDocs**

Use:

`await navigator.clipboard.writeText(summary);`  
`toast.success("Travel summary copied · تم نسخ ملخص السفر", { duration: 2000 });`  


If clipboard fails, catch and show:

`toast.error("Could not copy travel summary · تعذر نسخ ملخص السفر");`  


### **handleExportTravelDocs**

Create travel-documents.txt similarly to handleExportRecords.

Use:

- Blob
- URL.createObjectURL
- hidden/download anchor
- URL.revokeObjectURL

Toast success:

`toast.success("Travel docs exported · تم تصدير وثائق السفر", { duration: 2000 });`  


If export fails, catch and show a bilingual error toast.

---

## **5. Optional: Travel-specific share summary**

Current Travel branch uses handleShareRecords, which currently builds a medical-records summary from records, not Travel rows.

Please either:

1. add handleShareTravelDocs using visibleTravelDocs, or
2. update the Travel menu’s Share action to use the new Travel summary helper.

Do not use the medical records list for Travel sharing.

If navigator.share exists:

`await navigator.share({`  
  `title: "Travel Documents",`  
  `text: summary,`  
`});`  


Fallback:

`window.openhttps://wa.me/?text=${encodeURIComponent(summary)}, "_blank");`  


Empty state should use the same:  
No travel documents yet · لا توجد وثائق سفر بعد

---

## **6. Keep row-level Travel kebab unchanged**

Do not modify:

- per-card kebab buttons,
- RecordActionsSheet,
- preview/rename/delete/apply-to-milestone behavior.

---

## **Acceptance criteria**

1. Header ＋ Scan text pill is replaced by an icon-only circular scan button.
2. The scan button has:
  - aria-label="Scan document · مسح وثيقة"
  - title="Scan document · مسح وثيقة"
  - gold background,
  - navy ScanLine icon,
  - w-9 h-9 circular footprint.
3. Medical kebab remains unchanged.
4. Travel kebab now has:
  - Scan Travel Document,
  - Copy Travel Summary,
  - Export Travel Docs (.txt),
  - Share Travel Docs.
5. Copy Travel Summary uses the currently visible Travel rows, including current search/category filter.
6. Export Travel Docs creates travel-documents.txt from the currently visible Travel rows.
7. Share Travel Docs does not use the Medical records summary.
8. Empty Travel list shows:  
No travel documents yet · لا توجد وثائق سفر بعد  
and skips clipboard/file/share actions.
9. No new Supabase query is added just for copy/export/share.

10. Row-level Travel card kebab remains unchanged.
11. Run:
  - npm run typecheck
  - relevant tests if available.

  
`---`  
  
`## Why this prompt is stricter than the original enhancement`  
  
`The original enhancement says to add Travel copy/export handlers “next to” the Medical handlers in RecordsScreen, but the parent does not currently know which Travel rows are visible. TravelRecordsList owns both the fetched items state and the filtered rows. 【F:src/components/records/TravelRecordsList.tsx†L60-L68】【F:src/components/records/TravelRecordsList.tsx†L100-L110】`  
  
`So a complete, correct fix needs a tiny data bridge from TravelRecordsList to RecordsScreen.`  
  
`---`  
  
`## Checks I ran`  
  
`* ✅ git status --short; nl -ba src/screens/RecordsScreen.tsx | sed -n '1,180p;180,280p'; nl -ba src/components/records/TravelRecordsList.tsx | sed -n '1,130p;130,260p'; nl -ba src/components/HeaderMenu.tsx | sed -n '1,180p'`  
`* ✅ nl -ba src/screens/RecordsScreen.tsx | sed -n '100,170p'; nl -ba src/screens/RecordsScreen.tsx | sed -n '260,275p'; nl -ba src/components/records/TravelRecordsList.tsx | sed -n '1,115p'`  
`* ✅ rg -n "export interface TransportAttachment|type TransportAttachment|TransportAttachment" src/components/RelatedDocumentsCard.tsx src -S | head -40; nl -ba src/components/RelatedDocumentsCard.tsx | sed -n '1,80p'; nl -ba src/components/records/TravelRecordsList.tsx | sed -n '115,240p'`  


  
