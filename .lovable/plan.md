## I — Milestone fixes

### 1. Merge boarding-pass into Related Documents (no dedicated section)
- `src/components/journey/MilestoneSheet.tsx`: stop rendering separate `RelatedDocumentsCard` instances per `documentSlots[]`. Remove the `hasExtraSlots` block and the `excludeSubcategories=["Boarding Pass"]` exclusion below it.
- `src/components/RelatedDocumentsCard.tsx`: add an optional `uploadSlots` prop (`{ segmentRef, title, hint }[]`). Render these as compact "Attach boarding pass — {Traveler}" tiles inline alongside the existing thumbnails (same grid), each wired to the existing `onPickFile` flow but tagging the upload with the slot's `segment_ref` + `Boarding Pass` subcategory. Slot tiles disappear once a matching boarding pass exists for that traveler.
- `JourneyScreen.tsx`: pass the existing per-traveler slot list via the new `uploadSlots` prop on the single Related Documents card instead of `documentSlots`.

### 2. Dashboard wording (`Home → Journey Map`)
- In `src/components/home/*` (Journey Map preview), change the current-milestone chip from `TODAY` to `NEXT` when the milestone is the next upcoming one (today or future). Past stays as date.

### 3. Helicopter view wording
- `src/components/journey/HelicopterCanvas.tsx` line ~283: `NOW · …` → `NEXT · …` (and Arabic `الآن` → `التالي`).
- `src/components/journey/HelicopterTimelineRail.tsx` line ~256: `NOW · الآن` → `NEXT · التالي`.
- `MilestoneSheet.tsx` header pill: keep "Today" for the in-progress current step, but rename the upcoming-but-soon header label from "Today · {date}" to "Next · {date}" when state is `upcoming` and milestone is the soonest one.

## II — Thumbnail loading regression

Symptoms: tiles show only the placeholder icon. Likely causes to verify and fix in `RelatedDocumentsCard.tsx`:
- The `useEffect` on `[items]` depends on the array reference, which changes every refresh and triggers re-signing in a loop, often racing with cleanup (`cancelled = true`) before `setThumbs` runs. Switch the dep to a stable key (e.g. `items.map(i=>i.id).join(",")`).
- `createSignedUrls` is called with the *raw* `file_path`. If `file_path` already includes the bucket prefix the call returns `{ error }` silently. Normalise paths (strip leading bucket name) and log errors to console in dev.
- Filter `pending` to entries that actually have `file_path` AND a known image mime; today some PDFs slip through `isImage` when `mime_type` is null.
- Also pre-resolve thumbnails for PDFs by reusing the first-page render path already in `UniversalDocumentPreview` (optional, fallback to existing icon if it fails).

Add a Vitest case in `src/components/__tests__/RelatedDocumentsCard.thumbs.test.tsx` that mounts the card with two image rows and asserts the tiles receive a `src` attribute after `createSignedUrls` resolves.

## III — Visible upload entry + remember expansion per milestone

- `MilestoneSheet.tsx`: replace local `useState(defaultExpanded)` with a `useExpandedMilestones(id)` hook backed by `localStorage` (`rufayq:milestone-expanded:{milestoneId}`). Fall back to `defaultExpanded` when no stored value exists.
- `JourneyScreen.tsx`: for every flight milestone in `state !== "done"` that has traveler slots, set `defaultExpanded={true}` (already partly done) AND ensure the merged Related Documents card always shows the "Attach boarding pass" slot tiles from item I.1 so the entry point is visible without expansion of an inner card. The persistence hook from above then keeps the user's manual collapse/expand choice sticky.

## Technical notes

- Strings are bilingual: update EN + AR copies in the same spot. Keep design tokens; no new colors.
- No DB / RLS / edge-function changes.
- Update existing tests: `MilestoneSheet.test.tsx` (slot card removed → assert merged tiles), `TransportCard.tapForDetails.test.tsx` (unaffected, sanity run), and add the new thumbnail test.

## Files to touch
- `src/components/journey/MilestoneSheet.tsx`
- `src/components/RelatedDocumentsCard.tsx`
- `src/components/journey/HelicopterCanvas.tsx`
- `src/components/journey/HelicopterTimelineRail.tsx`
- `src/components/home/TodayCard.tsx` (or the Journey Map preview component used by HomeScreen)
- `src/screens/JourneyScreen.tsx`
- `src/hooks/useExpandedMilestones.ts` (new)
- `src/components/__tests__/RelatedDocumentsCard.thumbs.test.tsx` (new)
- `src/components/journey/__tests__/MilestoneSheet.test.tsx` (update)
