  
`You are working in the Lovable.dev GitHub-connected RufayQ repository.`  
  
`Important:`  
`- Do not only patch a local workspace.`  
`- Commit all code changes to the Lovable-connected GitHub branch so they ship to production.`  
`- Include and apply the Supabase migration/storage changes required for the connected production Supabase project.`  
`- If similar changes already exist in the latest branch/commit, audit them and complete any missing parts instead of duplicating them.`  
  
`# Goal`  
  
`Make scanned flight tickets durably persisted in Supabase, including AI extraction metadata and analyzed page images. Add a per-ticket Re-scan action and show AI provider / confidence / detected language on each scanned ticket.`  
  
`This must fix:`  
`1. Ticket scans showing OpenAI integration/extraction errors without durable fallback diagnostics.`  
`2. Scanned ticket metadata/images being lost after sign-out, incognito login, or clearing site data.`  
`3. Re-scan being impossible after reload because analyzed images were only held in client state/local storage.`  
  
`# Production requirement`  
  
`The fix must be committed to the GitHub repository Lovable.dev builds from. Local-only changes do not solve the live app.`  
  
`Also verify the connected Supabase project has:`  
`- extract-flight-ticket-ai deployed.`  
`- scan-itinerary deployed as Gemini fallback.`  
`- OPENAI_API_KEY configured.`  
`- LOVABLE_API_KEY configured for Gemini fallback.`  
`- The new migration applied.`  
`- The new private transport-scans bucket created with RLS.`  
  
`If any required Edge Function or secret is missing, surface that clearly and add the missing secret/deployment instruction through the appropriate Lovable/Supabase workflow before marking complete.`  
  
`---`  
  
`# 1. Supabase migration`  
  
`Create or update:`  
`supabase/migrations/20260512120000_transport_scan_metadata.sql`  
  
`## Schema additions`  
  
`Add these columns to public.transport_tickets:`  
  
````sql`  
`ALTER TABLE public.transport_tickets`  
  `ADD COLUMN IF NOT EXISTS extraction_provider text`  
    `CHECK (extraction_provider IS NULL OR extraction_provider IN ('openai', 'gemini')),`  
  `ADD COLUMN IF NOT EXISTS extraction_confidence numeric(3,2)`  
    `CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1)),`  
  `ADD COLUMN IF NOT EXISTS detected_language text,`  
  `ADD COLUMN IF NOT EXISTS extraction_translated boolean NOT NULL DEFAULT false,`  
  `ADD COLUMN IF NOT EXISTS extraction_run_at timestamptz,`  
  `ADD COLUMN IF NOT EXISTS source_image_paths text[] NOT NULL DEFAULT '{}';`  


Existing rows must be tolerated. All new nullable metadata columns should safely map to null; source_image_paths should default to an empty array.

## **Storage bucket**

Create a private bucket:

`INSERT INTO storage.buckets (id, name, public)`  
`VALUES ('transport-scans', 'transport-scans', false)`  
`ON CONFLICT (id) DO UPDATE SET public = false;`  


Object path convention:

`<auth.uid() | device:<deviceId>>/<ticketId>/page-<n>.png`  


Examples:

`4e6b...user-id.../ticket-uuid/page-1.png`  
`device:abc123/ticket-uuid/page-1.png`  


## **RLS**

Add one policy per command on storage.objects for bucket transport-scans:

- SELECT
- INSERT
- UPDATE
- DELETE

Allow access when:

1. bucket_id = 'transport-scans', and
2. one of these is true:
  - first folder segment equals auth.uid()::text
  - first folder segment equals 'device:' || x-device-id header
  - authenticated admin bypass using public.has_role(auth.uid(), 'admin')

Use the same owner predicate for USING and WITH CHECK where applicable.

Non-owner users must not be able to read another user’s transport-scans files.

---

# **2. Type/model changes**

Update src/lib/transportTickets.ts:

`export type ExtractionProvider = "openai" | "gemini";`  
  
`export interface TicketExtractionMetadata {`  
  `provider: ExtractionProvider;`  
  `confidence?: number | null;`  
  `detectedLanguage?: string | null;`  
  `translated?: boolean;`  
  `runAt?: string | null;`  
`}`  


Extend TransportTicket:

`interface TransportTicket {`  
  `// existing fields...`  
  `extraction?: TicketExtractionMetadata | null;`  
  `sourceImagePaths?: string[];`  
`}`  


Ensure manual-entry tickets either have source: "manual" and no extraction, or extraction: null.

When adapting TransportTicket to TransportSegment, propagate extraction so card/detail UI can show scan badges for every segment belonging to the scanned ticket.

---

# **3. Transport store mapping**

Update src/lib/transportStore.ts.

ticketToRow(ticket) must write:

`extraction_provider`  
`extraction_confidence`  
`detected_language`  
`extraction_translated`  
`extraction_run_at`  
`source_image_paths`  


rowToTicket(row) must read them back into:

`ticket.extraction`  
`ticket.sourceImagePaths`  


Rules:

- If row.extraction_provider is null, set extraction: null.
- Convert numeric confidence safely with Number(...) when needed.
- If source_image_paths is null or missing, use [].
- Keep existing signed-in/user/device dual-scope reads unchanged so signed-in users can recover tickets after device id changes.

---

# **4. Storage helpers**

Create or update:

src/lib/transportScanStorage.ts

Export:

`uploadScanImages(scope, ticketId, dataUrls): Promise<string[]>`  
`fetchScanImagesAsDataUrls(paths): Promise<string[]>`  


Behavior:

## **uploadScanImages(scope, ticketId, dataUrls)**

- If signed in, use auth.uid() as the first folder segment.
- Otherwise use device:<deviceId>.
- Convert each data URL to Blob.
- Upload each image to:

`transport-scans/<ownerFolder>/<ticketId>/page-<n>.png`  


- Use upsert: true so retrying the same ticket id is safe.
- Return object paths.
- Throw a typed/clear error if upload fails.

## **fetchScanImagesAsDataUrls(paths)**

- For each path:
  - call createSignedUrl
  - fetch the signed URL
  - convert the blob back to a data URL
- Return the data URL array.
- Throw a typed/clear error if signing or downloading fails.

---

# **5. Scanner and save path**

## **ScannerWizard.tsx**

After successful:

`extractFlightTicket({ files })`  


include this in the emitted payload:

`extraction: {`  
  `provider: extracted.provider,`  
  `confidence: extracted.confidence ?? null,`  
  `detectedLanguage: extracted.detectedLanguage ?? null,`  
  `translated: Boolean(extracted.translated),`  
  `runAt: new Date().toISOString(),`  
`},`  
`pageImages: files,`  


Do not attach extraction metadata to manual-entry tickets.

## **Persistence handler, likely JourneyScreen.tsx**

When turning the scanner payload into a TransportTicket:

1. Generate the final ticketId first.
2. Build the ticket with extraction from the scanner payload.
3. Upload pageImages with uploadScanImages(scope, ticketId, pageImages).
4. Save returned paths into ticket.sourceImagePaths.
5. Call the existing addTicket() / saveTicket() path.

If image upload fails:

- Still persist the ticket and extraction metadata.
- Set sourceImagePaths: [].
- Toast clearly:

`Re-scan unavailable: image upload failed.`  


or bilingual equivalent.

Do not silently fail.

---

# **6. Re-scan**

Create or update:

src/lib/transportRescan.ts

Export:

`rescanTicket(ticket, scope): Promise<TransportTicket>`  


Behavior:

1. Reject manual tickets.
2. Reject tickets with no sourceImagePaths.
3. Fetch stored images:

`const files = await fetchScanImagesAsDataUrls(ticket.sourceImagePaths)`  


4. Run:

`const extracted = await extractFlightTicket({ files })`  


5. Build an updated ticket preserving:

`id`  
`deviceId`  
`userId`  
`createdAt`  
`tripType`  
`saveToTransportTimeline`  
`saveToMedicalRecords`  
`sendToDoctor`  
`pendingSegmentRef`  
`traveler`  
`sourceImagePaths`  


6. Replace:

`outboundSegments`  
`returnSegments`  
`passengerName`  
`passengerPassport`  
`bookingReference`  
`extraction`  
`updatedAt`  


7. Set fresh extraction metadata:

`extraction: {`  
  `provider: extracted.provider,`  
  `confidence: extracted.confidence ?? null,`  
  `detectedLanguage: extracted.detectedLanguage ?? null,`  
  `translated: Boolean(extracted.translated),`  
  `runAt: new Date().toISOString(),`  
`}`  


8. Call:

`await saveTicket(updated)`  


This should upsert the same id, so retry is idempotent.

9. Toast success:

`Provider · NN% · LANG`  


Example:

`OpenAI · 91% · EN`  


10. Toast failure with bilingual retry hint.

---

# **7. Timeline hook**

Update src/hooks/useTransportTimeline.ts.

Expose:

`rescan(ticketId): Promise<TransportTicket>`  


Behavior:

- Find the ticket by id from current state.
- Call rescanTicket(ticket, scope).
- Replace the existing ticket in state with the returned updated ticket.
- Keep ordering by createdAt.
- Surface errors without leaving stale spinner state.

---

# **8. UI**

## **TransportCard.tsx**

When seg.extraction?.provider exists:

Render an inline metadata row under the card header:

- Provider chip:
  - OpenAI
  - Gemini
- Confidence chip:
  - >= 0.85: success/green
  - 0.6–0.85: muted/amber
  - < 0.6: destructive/red or amber
- Language tag:
  - uppercase language code/string (EN, AR, etc.)

Manual-entry tickets must show no badges.

Use bilingual labels where the surrounding UI is bilingual.

## **TicketDetailSheet.tsx**

When the selected ticket has extraction.provider and is not manual:

Add a “Scan info” section:

- Provider
- Confidence percentage
- Detected language
- Translated badge when translated is true
- Relative or readable runAt
- Primary button: Re-scan ticket

Button rules:

- Hidden for manual tickets.
- Disabled if no sourceImagePaths.
- Disabled while running.
- Shows spinner while running.
- Calls useTransportTimeline().rescan(ticket.id) through props from the screen.

---

# **9. Tests**

## **src/lib/__tests__/transportRescan.test.ts**

Mock:

- extractFlightTicket
- saveTicket
- storage image fetch helper

Assert:

- Same ticket id is preserved.
- Same deviceId / userId scope is preserved.
- Same createdAt is preserved.
- Save flags are preserved.
- Segments are refreshed.
- Extraction metadata is refreshed.
- Retry is idempotent by saving/upserting the same id again.

## **src/screens/__tests__/ScannerWizard.e2e.test.tsx**

Mock extraction response with:

`provider: "openai",`  
`confidence: 0.88,`  
`detectedLanguage: "english",`  
`translated: false`  


Assert the emitted/saved scanner payload contains:

`extraction.provider`  
`extraction.confidence`  
`extraction.detectedLanguage`  
`pageImages`  


If the test covers the Journey persistence handler, also assert the final saved ticket has non-empty sourceImagePaths.

## **Mapper tests**

If transport store mapping tests exist, extend them to cover:

`transport_tickets.extraction_* <-> TransportTicket.extraction`  
`transport_tickets.source_image_paths <-> TransportTicket.sourceImagePaths`  


---

# **10. Docs**

Update:

docs/data-model.md

Document:

- New transport_tickets columns.
- transport-scans bucket.
- Object path format.
- User/device/admin RLS intent.
- Manual-entry tickets do not use these fields.

---

# **11. Verification**

Run:

`npm test -- --run src/screens/__tests__/ScannerWizard.e2e.test.tsx src/lib/__tests__/transportRescan.test.ts`  
`npx tsc --noEmit -p tsconfig.app.json`  
`npm run build`  


Also manually smoke test in the Lovable-connected deployed app:

1. Sign in.
2. Scan a flight ticket.
3. Confirm ticket saves.
4. Confirm provider/confidence/language badges appear.
5. Confirm source image paths are saved in Supabase.
6. Clear localStorage/site data or use incognito.
7. Sign back in.
8. Confirm the scanned ticket and badges still show.
9. Open ticket detail.

10. Click Re-scan ticket.
11. Confirm same row updates and metadata refreshes.
12. Confirm manual-entry tickets show no scan badges or re-scan button.

---

# **Out of scope**

Do not implement:

- Manual-edit-then-rescan merging.
- Re-uploading new images during re-scan.
- Bulk re-scan.
- Confidence-based blocking from saving.
- Prompt changes to the extraction Edge Function.

---

# **Acceptance criteria**

1. New columns exist in public.transport_tickets.
2. Private transport-scans bucket exists.
3. Storage RLS prevents non-owner reads.
4. Scanning persists extraction provider/confidence/language/translated/runAt.
5. Scanning uploads analyzed page images and stores object paths.
6. Card and detail sheet show badges for scanned tickets only.
7. Manual-entry tickets show no badges and no re-scan action.
8. Re-scan uses stored images, updates the same ticket row, preserves id/scope/createdAt, and refreshes metadata.
9. After clearing site data and signing back in, scanned tickets still show badges and Re-scan still works.

10. Edge functions and required secrets are verified in the connected Supabase project.
11. Tests, type-check, and build pass.
12. All changes are committed to the GitHub-connected Lovable repo branch.

  
`---`  
  
  
`## Commands I used for this fix`  
  
`* git status --short && git log -1 --oneline && nl -ba supabase/migrations/20260512120000_transport_scan_metadata.sql | sed -n '1,80p' && nl -ba src/lib/transportScanStorage.ts | sed -n '1,90p' && nl -ba src/screens/ScannerWizard.tsx | sed -n '693,714p' && nl -ba src/screens/JourneyScreen.tsx | sed -n '258,273p'`  


13 files to be changed+427-4

UndoReview

docs/data-model.md

src/components/TicketDetailSheet.tsx

src/components/TransportCard.tsx

src/hooks/useTransportTimeline.ts

src/lib/__tests__/transportRescan.test.ts

src/lib/transportRescan.ts

src/lib/transportScanStorage.ts

src/lib/transportStore.ts

src/lib/transportTickets.ts

src/screens/JourneyScreen.tsx

src/screens/ScannerWizard.tsx

src/screens/__tests__/ScannerWizard.e2e.test.tsx

supabase/migrations/20260512120000_transport_scan_metadata.sql

  
