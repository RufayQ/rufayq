# Transport Timeline Durable Scan + Typed Re-scan Refactor

You are working in the [Lovable.dev](http://Lovable.dev) GitHub-connected RufayQ repository.

## Non-negotiable production requirements

1. Do not make local-only changes.

2. Commit all code changes to the GitHub-connected branch Lovable deploys from.

3. Ensure the connected Supabase project receives the required migration/storage changes.

4. Do not mark complete unless tests, TypeScript, and build pass.

5. Preserve user data. Re-scan must never wipe a previously valid ticket if extraction returns no usable segments.

6. Keep clean architecture:

   - storage helper handles storage-specific errors;

   - rescan helper handles domain-specific rescan errors;

   - UI/hook layer handles user-facing toasts;

   - persistence remains in `transportStore`.

---

# Current issue

Scanned flight tickets need durable AI extraction metadata and durable source scan images so they survive:

- sign-out/sign-in,

- incognito login,

- localStorage/site-data clearing,

- device id regeneration.

A previous implementation added metadata persistence, source image upload, badges, and re-scan, but the rescan error handling/refactor is incomplete and must be made production-grade.

In the currently visible code, `transportRescan.ts` still imports `toast`, throws generic `Error`, and calls `downloadTransportScanDataUrls`. It does not define `RescanError`. The storage helper currently exports `downloadTransportScanDataUrls`, not `fetchScanImagesAsDataUrls` or `ScanStorageError`.

Fix this end-to-end.

---

# Goal

Implement a scalable, typed, durable Transport Timeline scan and re-scan system:

1. Persist AI extraction metadata and analyzed page image paths on scanned tickets.

2. Upload analyzed page images to a private Supabase Storage bucket.

3. Show provider / confidence / detected language badges for scanned tickets.

4. Add a per-ticket Re-scan action using stored images.

5. Re-scan updates the same ticket row in place, preserving identity/scope fields.

6. Manual-entry tickets show no scan badges and no re-scan action.

7. Typed errors must prevent silent failure and give the UI enough information for clean bilingual toasts.

8. Empty extraction results must not overwrite previously good ticket data.

---

# A. Database and storage migration

Create or verify:

`supabase/migrations/20260512120000_transport_scan_metadata.sql`

## A1. `transport_tickets` columns

Add these columns:

```sql

ALTER TABLE public.transport_tickets

  ADD COLUMN IF NOT EXISTS extraction_provider text

    CHECK (extraction_provider IS NULL OR extraction_provider IN ('openai', 'gemini')),

  ADD COLUMN IF NOT EXISTS extraction_confidence numeric(3,2)

    CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1)),

  ADD COLUMN IF NOT EXISTS detected_language text,

  ADD COLUMN IF NOT EXISTS extraction_translated boolean NOT NULL DEFAULT false,

  ADD COLUMN IF NOT EXISTS extraction_run_at timestamptz,

  ADD COLUMN IF NOT EXISTS source_image_paths text[] NOT NULL DEFAULT '{}';

Rules:

Old rows must be tolerated.

extraction_provider, extraction_confidence, detected_language, extraction_run_at may be null.

source_image_paths should default to [].

Manual tickets should leave extraction metadata null/empty.

A2. Private bucket

Create private bucket:

sql

INSERT INTO storage.buckets (id, name, public)

VALUES ('transport-scans', 'transport-scans', false)

ON CONFLICT (id) DO UPDATE SET public = false;

Object path convention:

txt

<auth.uid() | device:<deviceId>>/<ticketId>/page-<n>.png

Examples:

txt

550e8400-e29b-41d4-a716-446655440000/8c7...ticket.../page-1.png

device:abc123/8c7...ticket.../page-1.png

A3. RLS policies

Add one policy per command for bucket transport-scans:

SELECT

INSERT

UPDATE

DELETE

Access is allowed only if:

bucket_id = 'transport-scans', and

one of the following is true:

first folder segment equals auth.uid()::text;

first folder segment equals 'device:' || x-device-id header;

authenticated admin bypass via public.has_role(auth.uid(), 'admin').

Use the same predicate in USING and WITH CHECK where appropriate.

Important:

Non-owner users must not read another user’s scan files.

Admin bypass is required for operational support.

Do not use public buckets or public URLs.

B. Transport ticket model

Update:

src/lib/transportTickets.ts

Add:

ts

export type ExtractionProvider = "openai" | "gemini";

export interface TicketExtractionMetadata {

  provider: ExtractionProvider;

  confidence?: number | null;

  detectedLanguage?: string | null;

  translated?: boolean;

  runAt?: string | null;

}

Extend TransportTicket:

ts

export interface TransportTicket {

  // existing fields...

  extraction?: TicketExtractionMetadata | null;

  sourceImagePaths?: string[];

}

Rules:

Manual-entry tickets should have source: "manual" and extraction: null or undefined.

Scanned tickets should have source: "ocr" and an extraction block.

When converting tickets to TransportSegment[], propagate ticket.extraction to each segment so cards/details can render badges.

C. Store mapping

Update:

src/lib/transportStore.ts

C1. ticketToRow

Write:

ts

extraction_provider: ticket.extraction?.provider ?? null,

extraction_confidence:

  typeof ticket.extraction?.confidence === "number"

    ? ticket.extraction.confidence

    : null,

detected_language: ticket.extraction?.detectedLanguage ?? null,

extraction_translated: Boolean(ticket.extraction?.translated),

extraction_run_at: ticket.extraction?.runAt ?? null,

source_image_paths: ticket.sourceImagePaths ?? [],

C2. rowToTicket

Read:

ts

extraction: row.extraction_provider

  ? {

      provider: row.extraction_provider,

      confidence:

        row.extraction_confidence == null

          ? null

          : Number(row.extraction_confidence),

      detectedLanguage: row.detected_language ?? null,

      translated: Boolean(row.extraction_translated),

      runAt: row.extraction_run_at ?? null,

    }

  : null,

sourceImagePaths: Array.isArray(row.source_image_paths)

  ? row.source_image_paths

  : [],

Rules:

Do not break old rows.

Do not break local cache shape.

Keep existing signed-in user/device dual-scope reads.

Keep saveTicket idempotent by upserting the same ticket id.

D. Storage helper refactor

Update:

src/lib/transportScanStorage.ts

This module must be the only place that knows storage bucket details.

D1. Export constants

ts

export const TRANSPORT_SCANS_BUCKET = "transport-scans";

D2. Typed storage error

Add:

ts

export type ScanStorageErrorCode =

  | "upload"

  | "sign"

  | "download"

  | "read"

  | "invalid-data-url";

export class ScanStorageError extends Error {

  constructor(

    message: string,

    public code: ScanStorageErrorCode,

    public cause?: unknown,

  ) {

    super(message);

    [this.name](http://this.name) = "ScanStorageError";

  }

}

D3. Owner prefix helper

Implement:

ts

export function scanOwnerPrefix(scope: {

  userId?: string | null;

  deviceId?: string | null;

}): string

Rules:

Prefer userId if present.

Otherwise use device:<deviceId>.

If no deviceId passed, fall back to getDeviceId().

D4. Data URL → Blob

Implement:

ts

export async function dataUrlToBlob(dataUrl: string): Promise<Blob>

Rules:

Validate it looks like a data URL.

Throw ScanStorageError(..., "invalid-data-url") if invalid.

Do not wrap imports in try/catch.

D5. Upload helper

Export:

ts

export async function uploadScanImages(

  scope: { userId?: string | null; deviceId?: string | null },

  ticketId: string,

  dataUrls: string[],

): Promise<string[]>

Behavior:

If dataUrls.length === 0, return [].

Resolve owner prefix.

Upload each page to:

txt

<ownerPrefix>/<ticketId>/page-<n>.png

Use bucket transport-scans.

Use upsert: true for idempotent retry.

Use content type from Blob or image/png.

Return the storage object paths.

On upload failure, throw ScanStorageError(message, "upload", cause).

D6. Backward-compatible alias

If existing code calls uploadTransportScanImages, keep it as a wrapper:

ts

export async function uploadTransportScanImages({

  ticketId,

  images,

  userId,

  deviceId,

}: {

  ticketId: string;

  images: string[];

  userId?: string | null;

  deviceId?: string | null;

}): Promise<string[]> {

  return uploadScanImages({ userId, deviceId }, ticketId, images);

}

D7. Fetch helper

Export:

ts

export async function fetchScanImagesAsDataUrls(

  paths: string[],

): Promise<string[]>

Behavior:

For each object path:

create a signed URL;

fetch it;

convert returned Blob to data URL.

On signing failure, throw ScanStorageError(message, "sign", cause).

On HTTP/fetch failure, throw ScanStorageError(message, "download", cause).

On FileReader/read failure, throw ScanStorageError(message, "read", cause).

D8. Backward-compatible alias

If existing code calls downloadTransportScanDataUrls, keep:

ts

export const downloadTransportScanDataUrls = fetchScanImagesAsDataUrls;

This prevents churn and accidental import breakage.

E. Scanner payload

Update:

src/screens/ScannerWizard.tsx

After successful:

ts

extractFlightTicket({ files })

emit:

ts

extraction: {

  provider: extracted.provider,

  confidence: extracted.confidence ?? null,

  detectedLanguage: extracted.detectedLanguage ?? null,

  translated: Boolean(extracted.translated),

  runAt: new Date().toISOString(),

},

pageImages: files,

Rules:

Only scanned/OCR tickets get extraction metadata.

Manual-entry payloads should not get extraction metadata.

Preserve existing segment parsing and passenger mapping.

Do not block save only because confidence is low.

F. Journey persistence path

Update:

src/screens/JourneyScreen.tsx

When converting scanner payload into a TransportTicket:

Generate final ticketId first.

Build ticket with:

extraction from scanner payload if source is OCR;

sourceImagePaths: [] initially.

Upload analyzed page images before saving:

ts

ticket.sourceImagePaths = await uploadScanImages(

  { userId, deviceId: ticket.deviceId },

  [ticket.id](http://ticket.id),

  pendingScan.pageImages,

);

or use the backward-compatible wrapper.

Then call addTicket(ticket).

If upload fails:

still persist the ticket and extraction metadata;

keep sourceImagePaths: [];

toast clearly:

txt

Re-scan unavailable: image upload failed.

or bilingual equivalent.

Do not silently swallow the failure.

G. Typed re-scan helper

Replace/update:

src/lib/transportRescan.ts

Important:

This module should not show sonner toasts directly.

It should throw typed errors.

UI/hook layer handles user-facing messages.

G1. Error type

Export:

ts

export type RescanErrorCode =

  | "manual"

  | "no-images"

  | "storage"

  | "extraction"

  | "save"

  | "unknown";

export class RescanError extends Error {

  constructor(

    message: string,

    public code: RescanErrorCode,

    public cause?: unknown,

  ) {

    super(message);

    [this.name](http://this.name) = "RescanError";

  }

}

G2. Function signature

ts

export async function rescanTicket(

  ticket: TransportTicket,

  scope: TicketScope,

): Promise<TransportTicket>

No cachedDataUrls argument unless there is an actual in-memory cache feature using it. Keep API clean.

G3. Reject invalid tickets

ts

if (ticket.source === "manual") {

  throw new RescanError("Cannot re-scan a manually entered ticket", "manual");

}

const paths = ticket.sourceImagePaths ?? [];

if (paths.length === 0) {

  throw new RescanError("No source images stored for this ticket", "no-images");

}

Do not require ticket.extraction?.provider to exist if sourceImagePaths exist. Some previously scanned tickets may have images but incomplete metadata. Images are the real requirement for re-scan.

G4. Fetch stored images

ts

let files: string[];

try {

  files = await fetchScanImagesAsDataUrls(paths);

} catch (error) {

  if (error instanceof ScanStorageError) {

    throw new RescanError(error.message, "storage", error);

  }

  throw new RescanError("Failed to load stored scan images", "storage", error);

}

G5. Run extraction

ts

let extracted: NormalizedFlightExtraction;

try {

  extracted = await extractFlightTicket({ files });

} catch (error) {

  throw new RescanError(

    error instanceof Error ? error.message : "Extraction failed",

    "extraction",

    error,

  );

}

G6. Map segments and guard no-leg response

ts

const outboundSegments = [extracted.rawOutbound.map](http://extracted.rawOutbound.map)((raw, index) =>

  parsedLegToSegment(raw, "outbound", index),

);

const returnSegments = [extracted.rawReturn.map](http://extracted.rawReturn.map)((raw, index) =>

  parsedLegToSegment(raw, "return", index),

);

if (outboundSegments.length === 0 && returnSegments.length === 0) {

  throw new RescanError("Extraction returned no segments", "extraction");

}

This guard must happen before saveTicket.

G7. Build updated ticket

Preserve:

id

deviceId, with scope fallback

userId, with scope fallback

createdAt

tripType

saveToTransportTimeline

saveToMedicalRecords

sendToDoctor

pendingSegmentRef

traveler

source

sourceImagePaths

Refresh:

outboundSegments

returnSegments

passengerName

passengerPassport

bookingReference

extraction

updatedAt

Example:

ts

const now = new Date().toISOString();

const passengerName =

  [extracted.passengerFirstName, extracted.passengerLastName]

    .filter(Boolean)

    .join(" ")

    .trim() || ticket.passengerName;

const updated: TransportTicket = {

  ...ticket,

  id: [ticket.id](http://ticket.id),

  deviceId: ticket.deviceId || scope.deviceId,

  userId: ticket.userId ?? scope.userId ?? null,

  createdAt: ticket.createdAt,

  tripType: ticket.tripType,

  saveToTransportTimeline: ticket.saveToTransportTimeline,

  saveToMedicalRecords: ticket.saveToMedicalRecords,

  sendToDoctor: ticket.sendToDoctor,

  pendingSegmentRef: ticket.pendingSegmentRef ?? null,

  traveler: ticket.traveler,

  source: ticket.source ?? "ocr",

  sourceImagePaths: paths,

  outboundSegments,

  returnSegments,

  passengerName: passengerName || undefined,

  passengerPassport: extracted.passportNumber || ticket.passengerPassport,

  bookingReference:

    outboundSegments[0]?.pnr ||

    returnSegments[0]?.pnr ||

    ticket.bookingReference,

  extraction: {

    provider: extracted.provider,

    confidence: extracted.confidence ?? null,

    detectedLanguage: extracted.detectedLanguage ?? null,

    translated: Boolean(extracted.translated),

    runAt: now,

  },

  updatedAt: now,

};

G8. Save

ts

try {

  return await saveTicket(updated);

} catch (error) {

  throw new RescanError(

    error instanceof Error ? error.message : "Save failed",

    "save",

    error,

  );

}

H. Timeline hook

Update:

src/hooks/useTransportTimeline.ts

Expose:

ts

rescan(ticketId: string): Promise<TransportTicket>

Behavior:

Find ticket by id.

If not found, throw a normal error or RescanError("Ticket not found", "unknown").

Call rescanTicket(ticket, scope).

Replace the ticket in state with the returned ticket.

Sort by createdAt.

Return updated ticket.

Do not show toasts here unless all re-scan UI paths go through this hook. Prefer UI-level toast in TicketDetailSheet.

I. UI toast handling

Update:

src/components/TicketDetailSheet.tsx

The sheet currently starts/stops spinner in try/finally. It must also catch errors and show user-facing toast.

I1. Success toast

After onRescanTicket([ticket.id](http://ticket.id)) returns updated ticket:

ts

const extraction = updated.extraction;

toast.success("Ticket re-scanned · تمت إعادة مسح التذكرة", {

  description: extraction

    ? `${providerLabel(extraction.provider)} · ${confidenceLabel(extraction.confidence)} · ${extraction.detectedLanguage || "LANG ?"}`

    : undefined,

});

I2. Failure toast

Catch RescanError and show message by code:

ts

const messageByCode = {

  manual: "Manual tickets cannot be re-scanned · لا يمكن إعادة مسح التذاكر اليدوية",

  no-images: "Original scan images are missing · صور المسح الأصلية غير متوفرة",

  storage: "Could not load stored scan images · تعذر تحميل صور المسح",

  extraction: "AI could not extract this ticket · تعذر استخراج بيانات التذكرة",

  save: "Re-scan succeeded but saving failed · نجح المسح ولكن فشل الحفظ",

  unknown: "Re-scan failed · فشلت إعادة المسح",

};

Toast:

ts

toast.error(messageByCode[error.code] ?? messageByCode.unknown, {

  description: "Please try again. If the problem continues, re-upload the ticket. · حاول مرة أخرى.",

});

If error is not RescanError, show generic bilingual failure.

I3. Spinner safety

Always clear spinner in finally.

I4. Button visibility

Hide scan info and re-scan for manual tickets.

Disable button if:

rescanning;

no sourceImagePaths;

no onRescanTicket.

J. UI badges

Update/verify:

src/components/TransportCard.tsx

When seg.extraction?.provider exists:

Provider chip:

OpenAI

Gemini

Confidence chip:

>= 0.85: success/green

0.6 <= confidence < 0.85: muted/amber

< 0.6: destructive/red/amber

Language tag:

uppercase detected language/code.

Rules:

Manual tickets show no badges.

If confidence is null, show provider/language only or “confidence —”.

Use bilingual label text where UI style supports it.

K. Ticket detail scan-info section

Update/verify:

src/components/TicketDetailSheet.tsx

For scanned tickets only:

Show:

provider

confidence percentage

detected language

translated badge

readable or relative run time

primary Re-scan ticket button

Rules:

Hide for manual tickets.

Disable re-scan when no sourceImagePaths.

Spinner while running.

Success/failure toast handled here.

No re-scan button for old scanned rows without source images unless disabled with clear hint.

L. Tests

Replace/add:

src/lib/__tests__/transportRescan.test.ts

Use Vitest.

Mock:

@/lib/transportScanStorage

@/lib/flightExtraction

@/lib/transportStore

Required cases

Manual ticket:

throws RescanError

code === "manual"

fetch/extract/save not called

Empty sourceImagePaths:

throws RescanError

code === "no-images"

fetch/extract/save not called

Storage failure:

fetchScanImagesAsDataUrls throws ScanStorageError

rescan throws RescanError

code === "storage"

cause preserved

extract/save not called

Extraction failure:

extractFlightTicket throws

rescan throws RescanError

code === "extraction"

save not called

Zero extracted segments:

extraction returns rawOutbound: [], rawReturn: []

rescan throws RescanError

code === "extraction"

save not called

previously valid ticket is not wiped

Save failure:

save throws

rescan throws RescanError

code === "save"

cause preserved

Happy path:

preserves:

id

deviceId

userId

createdAt

traveler

saveToTransportTimeline

saveToMedicalRecords

sendToDoctor

pendingSegmentRef

sourceImagePaths

refreshes:

outboundSegments

returnSegments

passengerName

passengerPassport

bookingReference

extraction.provider

extraction.confidence

extraction.detectedLanguage

extraction.translated

extraction.runAt

updatedAt

saveTicket called once with same id

Idempotent retry:

two sequential calls keep same id

same createdAt

save/upsert uses same ticket id both times

Scanner E2E

Update/verify:

src/screens/__tests__/ScannerWizard.e2e.test.tsx

Mock extraction response with:

ts

provider: "openai",

confidence: 0.88,

detectedLanguage: "english",

translated: false,

Assert emitted/saved scanner payload includes:

ts

extraction.provider

extraction.confidence

extraction.detectedLanguage

pageImages

If the test covers final Journey persistence, also assert saved ticket includes non-empty sourceImagePaths.

Store mapper tests

If mapper tests exist, cover:

ts

transport_tickets.extraction_* <-> TransportTicket.extraction

transport_tickets.source_image_paths <-> TransportTicket.sourceImagePaths

M. Documentation

Update:

docs/[data-model.md](http://data-model.md)

Document:

new transport_tickets columns;

transport-scans bucket;

object path convention;

owner/device/admin RLS;

manual tickets do not use scan metadata;

re-scan relies on stored source images.

N. Verification commands

Run all:

bash

npx vitest run src/screens/__tests__/ScannerWizard.e2e.test.tsx src/lib/__tests__/transportRescan.test.ts

npx tsc --noEmit -p [tsconfig.app](http://tsconfig.app).json

npm run build

Also run lint if configured and not currently broken:

bash

npm run lint

If lint has pre-existing unrelated failures, report them clearly with file paths.

O. Manual smoke test checklist

In the Lovable-connected deployed app:

Sign in.

Scan a flight ticket.

Confirm ticket saves.

Confirm provider/confidence/language badges appear on card.

Open detail sheet and confirm Scan info appears.

Confirm source_image_paths has paths in Supabase.

Confirm files exist in private transport-scans.

Clear site data or open incognito.

Sign back in.

Confirm ticket still appears.

Confirm badges still appear.

Click Re-scan ticket.

Confirm same row updates and metadata refreshes.

Confirm manual-entry ticket shows no badges and no re-scan action.

Confirm another user cannot read these storage objects.

P. Edge Function readiness

Before marking complete, verify connected Supabase project has:

extract-flight-ticket-ai deployed.

scan-itinerary deployed.

OPENAI_API_KEY configured.

LOVABLE_API_KEY configured for Gemini fallback.

If not, report exactly what is missing and do not mark production-ready.

Q. Acceptance criteria

transport_tickets has extraction metadata columns and source_image_paths.

transport-scans private bucket exists.

Storage RLS blocks non-owner reads and supports admin bypass.

Scanning persists provider/confidence/language/translated/runAt.

Scanning uploads analyzed pages and stores object paths.

Card badges appear for scanned tickets only.

Detail sheet Scan info appears for scanned tickets only.

Manual tickets show no scan badges and no re-scan action.

Re-scan uses stored images.

Re-scan preserves same ticket row id.

Re-scan preserves device/user scope and createdAt.

Re-scan preserves save flags, traveler, pendingSegmentRef, sourceImagePaths.

Re-scan refreshes segments and extraction metadata.

Empty extraction response never wipes existing segments.

Typed errors exist and are tested.

UI shows clear success/failure toasts.

After clearing site data and signing back in, scanned ticket badges still render.

After clearing site data and signing back in, Re-scan still works.

Tests pass.

TypeScript passes.

Build passes.

Changes are committed to the GitHub-connected Lovable branch.

R. Out of scope

Do not implement:

manual-edit-then-rescan merging;

re-uploading new images during re-scan;

bulk re-scan;

confidence-based save blocking;

extraction prompt changes;

public storage access.

---

## Why this plan is stricter than Lovable’s plan

Lovable’s plan assumes the typed refactor already exists. In the code I can currently see, it does not: `transportRescan.ts` still uses direct `sonner` toasts and generic errors, while `transportScanStorage.ts` lacks `ScanStorageError` and `fetchScanImagesAsDataUrls`. 【F:src/lib/transportRescan.ts†L1-L19】【F:src/lib/transportScanStorage.ts†L49-L68】

It also says “UI no changes,” but the current detail sheet only uses `try/finally` around `onRescanTicket` and does not catch errors or toast them if the helper stops toasting. 【F:src/components/TicketDetailSheet.tsx†L304-L312】 The current hook also does not catch/toast; it simply calls `rescanTransportTicket` and updates state. 【F:src/hooks/useTransportTimeline.ts†L136-L145】

So the replacement plan above explicitly covers:

* storage typed errors,

* rescan typed errors,

* no-segment guard,

* UI toast ownership,

* backward-compatible helper aliases,

* stronger tests,

* production Supabase readiness,

* clean module responsibilities.

---

## Commands I used

* ✅ `git status --short --branch && nl -ba src/lib/transportRescan.ts | sed -n '1,80p' && nl -ba src/lib/transportScanStorage.ts | sed -n '1,90p' && nl -ba src/hooks/useTransportTimeline.ts | sed -n '135,165p' && nl -ba src/components/TicketDetailSheet.tsx | sed -n '285,315p'`Below is the **full replacement prompt/plan** I recommend giving [Lovable.dev](http://Lovable.dev). It is stricter and more complete than Lovable’s current plan because it does **not assume** the typed rescan refactor already exists. In the repo state I can see, `transportRescan.ts` still uses generic `Error` plus direct `sonner` toasts, and `transportScanStorage.ts` does not export `ScanUrls 【F:src/lib/transportRescan.ts†L1-L19】【F:src/lib/transportScanStorage.ts†L49-L68】

---

```md

# Transport Timeline Durable Scan + Typed Re-scan Refactor

You are working in the [Lovable.dev](http://Lovable.dev) GitHub-connected RufayQ repository.

## Non-negotiable production requirements

1. Do not make local-only changes. to theHub-connected branch Lov deploys from.

3. the connected Sup project receives the migration/storage changes.

4. Do not mark complete unless tests, TypeScript, and build pass.

5. Preserve user data. Re-scan must never wipe previously ticket usable clean storage;

 rescan handles-specific res   UI user;

   - persistence in ``.

---

# Current issue

Sc flight tickets need AI extraction metadata and durable source scan images so survive:

- sign-out/sign-in,

- inc,

/site clearing,

-.

A metadata, upload,, and re-scan, but the rescan error handling/refactor is incomplete and must be made production-grade.

In the currently visible code, `transportRescan.ts` still imports `toast`, throws generic `Error`, and calls `downloadTransportScanDataUrls`. It does not define `RescanError currently exports` downloadData `fetchAsUrlsError`.

Fix this end-to-end.

---

# Goal

Implement a scalable, typed, durable Transport Timeline scan and re-scan system:

1. Persist AI extraction metadata and analyzed page image paths on scanned tickets.

2. Upload analyzed page images to a private Supabase Storage bucket.

3 badges4-s stored images.

5. Re-scan updates the same ticket row in place, preserving identity/scope fields.

6. Manual-entry tickets show no scan badges and no re-scan action.

7. Typed errors must prevent silent failure and give the UI enough information for clean bilingual toasts.

8. Empty extraction results must not overwrite previously good ticket data.

---

# A. Database and storage migration

Create or verify:

`supabase/migrations/20260512120000_transport_scan_metadata.sql`

## A1. `transport_tickets` columns

Add these columns:

```sql

ALTER TABLE public.transport_tickets

  IF EXISTS extraction_provider text

 CHECK (extraction_provider IS NULL_provider IN',gem')),

 ADD COLUMN IF EXISTS extractionidence numeric(32)

    CHECK (ex_conf IS OR (ex_confidence >= 0 extraction <= )),

  ADD COLUMN IF NOT EXISTS text,

 NOT EXISTS extraction_translated boolean NOT NULL DEFAULT false,

  ADD COLUMN IF NOT EXISTS extraction_run_at timestamptz,

  ADD COLUMN IF NOT EXISTS source_image_paths text[] NOT NULL DEFAULT '{}';

Rules:

Old rows must be tolerated.

extraction_provider, extraction_confidencedetected_languageextraction_run may be null.

source_image_paths should default to [].

Manual tickets should leave extraction metadata null/empty.

A2. Private bucket

Create private bucket:

sql

INSERT INTO storage.buckets (id, name, public)

VALUEStransport-scans', 'transport-scans', false)

ON CONFLICT (id) DO UPDATE SET public = false;

Object path convention:

() |<device/>/page<npng```

Examplestxt

page-1.png

device:abc123/8c7...ticket.../page-1.png

A3. RLS policies

Add one policy per command for bucket transport-scans:

SELECT

INSERT

UPDATE

DELETE

Access is allowed only if:

'ans'2 the following equalsauth.uid()::`;

folder segment equals:' x header - admin bypass.has(auth.uid(), 'admin')`.

Use the same predicate in USING and WITH CHECK where appropriate.

Important:

Non-owner users must not read another’s scan files.

Admin bypass is required for operational support.

Do use public buckets URLs# B. Transport ticket model

Update:

src/lib/transportTickets.ts

Add:

ts

export type ExtractionProvider = "openai" | "gemexport Ticket;

 number null ?: string | null;

 ?: At;

}

ExtendTransportTicket`:

ts

export interface TransportTicket  //Extraction;

 string[];

 tickets should have `source: ""` and `extraction: null` or undefined.

- Sc tickets should have `source: "ocr"` and an `extraction` block.

- When converting tickets to `TransportSegment[]`, propagate `ticket.extraction` to each segment so cards/details can render# C:

transport C.ToRow`

Write:

?. ?? nulltraction?.confidence "number"

    ? ticket.extraction.confidence

    : null,

detected_language:.extractionectedex:traction?.translated),

extraction_run_at: ticket.extraction?.runAt ?? null,

source_image_paths: ticket.sourceImagePaths ?? [],

C2. rowToTicket

Read:

ts

extraction: row.extraction_provider

  ? {

      provider row.extraction_provider      confidence:

.exidence

         

          : Number(row.extraction_conf:_trans rowtraction_run_at,

 }

  :,

Image: ArrayArray.source_image)

  ? row.source_image

  :Rules Do old Do not break local cache shape.

 Keep signed dual-scope reads- Keep `saveTicket`empot by upserting the same id.

---

. helper refactor

Update:

`src/lib/transportScanStorage.ts`

This module must be the only place that knows storage bucket details.

## D1. Export constants

```ts

export const TRANSPORT_SCANS_BUCKET = "transport-scans";

D2. Typed storage error

Add:

ts

export type ScanStorageErrorCode =

  "upload | "sign"

 | "download  | ""

  | "invalid-data-urlexport Scan extends Error {

 constructor(

   : string,

 public ScanStorageCode,

 public?:   (message);

 this}

## D3. Owner prefix helper

Implement:

```ts

export function scanOwnerPrefix(scope: {

  userId?: string null;

?: string null} string

userId` if present.

Otherwise use device:<deviceId>.

If no deviceId passed, fall back to getDeviceId().

D4. Data URL → Blob

Implement:

ts

export async function dataUrlToBlob(dataUrl: string): Promise<Blob>

Rules:

Validate it looks like a data URL.

(...-data if invalid not imports try/catch##5. Upload

Export:

ts

 scope {Id?: string |; deviceId string | null },

 : string,

 [],

): Promise<string[]>

If data.length ===, return owner prefix- each page:

txt

Id>/page-<n>.png

- Use bucket `transport-scans`.

- Use `upsert: true` for idempotent retry.

- Use content type from Blob or `image/png`.

- Return the storage object paths.

- On upload failure, throwScanStorageError, " cause)`6.ward

 existing codeupload`, as wrapper:

```ts

export async function uploadTransportScanImages({

  ticketId,

  images,

  userId,

  deviceId,

}: {

  ticketId: string;

  images: string[];

  userId?: string | null;

  deviceId?: string | null;

}): Promise<string[]> {

  return uploadScanImages({ userId, deviceId }, ticketId, images);

}

D7. Fetch helper

Export:

export async fetchScanAsDataUrls(

 : string[],

 Promise[]>

`

:

- For each object path:

  - create a signed URL;

  - fetch it;

  - convert returned Blob to data URL.

- On signing failure, throw `ScanStorageError(message, "sign", cause)`.

- On HTTP/fetch failure, throw `ScanStorageError(message, "download", cause`.

 cause-compatible

 existingDataUrlsexport downloadTransport =ImagesAsDataUrls churn EsrcScannerx`

After successful:

```ts

extractFlightTicket({ files })

emit:

ts

extraction  provider:,

 : extracted ??,

 Languageed,

(extracted.translated),

  runAt: new Date().toISOString(),

},

pageImages: files,

Rules:

Only scanned/OCR tickets get extraction metadata.

Manual-entry payloads should not get extraction metadata.

Preserve existing segment parsing and passenger mapping.

Do not block save only because confidence is low.

F. Journey persistence path

Update:

src/screens/JourneyScreen.tsx

When converting scanner payload into a TransportTicket:

Generate final ticketId first.

Build ticket with:

extraction from scanner payload if source is OCR;

sourcePaths: [] initially.

. Upload analyzed page images before saving:

ticket.sourceImage = upload {,:.device ,

 pending.pageImages,

);

or use the backward-compatible wrapper.

Then call addTicket(ticket).

If upload fails:

still persist the ticket and extraction metadata;

keep sourceImagePaths: [];

toast clearly:

txt

Re-scan unavailable: image upload failed.

or bilingual equivalent.

swallow theReplace/transport.ts

Important:

This should show sonner toasts directly.

should typed errors.

-/h layer user-facing messages.

G1 typeExport:

typecanCode

manual"

 "nostorage "

exportcanError extends Error {

 (

    message string,

    public code: RescanErrorCode,

 public cause unknown,

  )    super(message [this.name](http://this.name) "RescanError";

}

`

## G2. Function signature```tsexport async functioncanTicket(

  ticket:,

 Scope,

): Promise<TransportTicket>

`` `cachedDataUrls` argument unless there is actual in-memory cache feature using it. Keep API clean.

## G. Reject tickets

ts

 (ticket.source === "") {

 throw newError("Cannot re-s a manually entered ticket", "");

}

 paths = ticketImage (.length ===(" for this ticket", "n `exist`  scanned may have incomplete metadata are real requirement-s.

##4. Fetch images```let files: string[];

try {

  files = await fetchScanImagesAsDataUrls(paths);

} catch (error) {

  if (error instanceof ScanStorageError) {

    throw new RescanError(error.message, "storage", error);

  }

  throw new RescanError("Failed to load stored scan images", "storage", error);

}

G5. Run extraction

ts

 extracted: NormalFlightExtraction;

try  extracted await extractFlightTicket({ files });

} catch (error) {

  ResError(

    instanceof ?.messageExtraction failed",

    "traction",

 error  );

G6. Map segments and guard nots extracted, indexLegTo", return =.rawraw parsed(raw, " index (boundSegments === 0 &&Segments.length new(" returned no "traction}

This guard happen beforesave`.

G7. Build updated ticket

erve- id

deviceId, with scope fallback

userId, with scope fallback

createdAt

tripType

saveToTransportTimeline

saveToMedicalRecords

sendToDoctor

pendingSegmentRef

traveler

source

ImagePaths

Refresh boundSegments

return-engerName passengerPassport`

bookingReference

extraction updated`

Example```

now = newto();

const passengerName =

[extracted.passengerFirstName, extracted.passengerLastName]

.filter(Boolean)

.join(" ")

.trim() || ticket.passengerName;

const updated: TransportTicket = {

...ticket,

id: [ticket.id](http://ticket.id),

deviceId: ticket ||.device user ?? ?? createdAt,

tripType: ticket.trip saveTransport ticket.saveToTransport,

To ticket.saveTo sendToDoctor: ticket.sendToDoctor,

pendingSegmentRef: ticket.pendingSegmentRef ?? null,

traveler: ticket.traveler,

source: ticket.source ?? "ocr",

sourceImagePaths: paths,

outboundSegments,

returnSegments,

passengerName: passengerName || undefined,

Number || ticket.passengerPassport,

outbound[0r return0]?.r ticket.bookingReference,

extraction: {

provider,

extracted,

detected extractededLanguage null,

.translated),

At now updatedAt: now};

 G8 Save

 {

  return await saveTicket(updated);

 catcherror) {

  throw newcan    error instanceof Error ? error.message "Save failed "",

    error ``---

# H Timeline

Updatesrc/hooksTransportTimeline.ts`

Expose:

```ts

can(ticketId: string): ticket by. If throw errorRescanError("Ticket not found", "unknown")`.

3. Call `rescanTicket(ticket, scope)`.

4. Replace the ticket in state with the returned ticket.

5. Sort by `createdAt`.

6. Return updated ticket.

Do not show toasts here unless all re-scan UI paths throughTicketSheet I

Update:

`src/components/Ticket`

try It also catch show user-facing toast I. [SuccessAfterTicket.id](http://SuccessAfterTicket.id))` returnsts updated.extraction;

toast.success("Ticket re-scanned · تمت إعادة مسح التذكرة", {

  description: extraction

    ? `${providerLabel(extraction.provider)} ${Label(extraction.confidenceex.detected ||LANG ?"}    undefined,

});

Failurecan messageByCode = {

manual: "Manual tickets cannot be re-scanned · لا يمكن إعادة مسح التذاكر اليدوية",

no-images: "Original scan images are missing · صور المسح الأصلية غير متوفرة : "Could not load stored تعذر تحميل المسح",

extraction: "AI could not extract this ticket · تعذر استخراج بيانات التذكرة",

save: "Re-scan succeeded but saving failed · نجح المسح ولكن فشل الحفظ",

unknown: "Re-scan failed · فشلت إعادة المسح",

};

```ts

.error(messageByCode[ ?? messageCode. {

 description: " try. the problem continues, re-upload the ticket. · حاول.",

});

If is not Rescan, show generic bilingual failure3. Spinner

Always clear spinner in finally.

I4 Button visibility- Hide scan info and re-scan for manual tickets.

Disable button if:

rescanning;

no sourceImagePaths;

no on.

badges`

seg:

:

``

Confidence chip:

>= 0.85: success/green

0.6 <= confidence / - < 0.6`: destructive

Language tag uppercaseRules show no.

confidence null, onlyconfidence style supports it---

. Ticket detail scan-info section

/src/components/TicketSheet.tsx

only provider- confidence percentage- detected

translated badge- or run time- primary Re-sRules:

tickets.

can no `- here.

re-s for source with hint# L

:

src/tests/transportRes.test Vit@Scan @/lib/flightExtraction`

@/lib/transportStore

Required cases

Manual ticket:

throws RescanError

code === "manual"

fetch/extract/save not called

Empty sourceImagePaths:

throws RescanError

code === "no"

fetch/extract not called

Storage failure:

ImagesDataUrls throwsScanError - rescan throws ResError

=== "storage"

cause

extract/save not called

. Extraction failure:

-Ticket - - "extraction not called. segments:

-OutboundrawReturn []Res - code === "extraction"

save not called

previously valid ticket is not wiped

Save failure:

save throws

Res

:

id Iduser

At -

saveToTransportTimeline

-ToMedical -pendingSegmentRef`

` refresh:

SegmentsSegments passengerName`

passengerPassport

bookingReference

extraction.provider

extraction.confidence extraction.detect -.trans - extraction.runAt`

updatedAt

saveTicket called once with same id

Idempotent retry:

two sequential calls keep same id

same createdAt

save/upsert uses same ticket id both times

Scanner E2E

Update/verify`testsScannerWizard.e2e.test.tsMock extraction response:

ts

provider: "openai",

confidence: 0.88,

detectedLanguage: "english",

translated: false,

Assert emitted/saved scanner payload includes:

```ts

traction

extractionidenceex.detectedpage`

 covers final Journey persistence, assert ticket includes non-empty `sourceImage`.

 Store mapper tests

 mapper tests cover:

```transportickets.extraction_* <-> TransportTicket.extraction

transport_tickets.source_image_paths <-> TransportTicket.sourceImagePaths

M. Documentation:

docs/[data-model.md](http://data-model.md)`

Document:

new transport_tickets columns--sc bucket;

object path convention;

owner/device/admin RLS;

manual tickets do not use scan metadata;

re-scan relies on stored source images.

N. Verification commands

Run all:

bash

npx vitest run src/screens/__tests__/ScannerWizard.e2e.test.tsx src/lib/__tests__/transportRescan.test.ts

npx tsc --noEmit -p [tsconfig.app](http://tsconfig.app).json

npm run build

Also run lint if configured and not currently broken:

bash

npm run lint

If lint has pre-existing unrelated failures, report them clearly with file paths---

O Manual smoke test checklistIn the Lovable deployed app1 in.

Scan a flight ticket3. Confirm saves.

. Confirm provider/confidenceanguage badges appear on.

Open detail sheet and confirm Scan appears.

. Confirmsource_image_paths` has paths Supabase.

Confirm files exist private transport-scans.

Clear site data or incognito. Sign back in.

11 Confirm.

13 Confirm same metadata refreshes.

14 Confirm manual-entry no re action.

15 Confirm another cannot read these---

P. Function

Before marking verify connected Sup extract-ticket-ai deployed- scan-itinerary deployed.

OPEN_KEY configured.

LOVABLE_API_KEY configured for Gemini fallback.

If not, report exactly what is missing and do not mark production-ready.

Q _pathsans private. Storage RLS reads./conf/translated/runAt.

Scanning uploads analyzed pages and stores object paths.

Card badges appear for scanned tickets only.

Detail sheet Scan info appears for scanned tickets only.

Manual tickets show no scan badges and no re-scan action.

Re-scan uses stored images.

Re-scan preserves same ticket row id.

Re-scan preserves device/user scope and createdAt.

Re-scan preserves save flags, traveler,SegmentRef, sourceImage.

13 Re-s refreshes segments and extraction metadata.

Empty extraction response never wipes existing segments.

Typed errors exist and are tested.

UI shows clear success/failure toasts.

After clearing site data and in ticket badges site and signing back in, Re-scan still works.

Tests.

. Build ChangesHub-connected Lovable branch.

#. Out of scope implement:

manual-edit-then-res--uploading during re-s;

re-scan;

confidence-based save blocking;

extraction prompt changes;

storage.

Why plan is stricter than Lovable’s plan

Lovable’s assumes the typed refactor exists. the code I can currently see, does not: transportRescan.ts still uses direct sonner toasts and generic errors, while transportScanStorage.ts lacks ScanStorageError and fetchScanImagesAsDataUrls. 【F:src/lib/transportRescan.ts†L1-L19】【F:src/lib/transportScanStorage.ts†L49-L68】

It also says “UI no changes,” but the current detail sheet only uses tryinal around RescanTicket and does not catch errors toast them if helper stops toasting. 【F:src/components/TicketDetailSheet.tsx†L304-L312】 current hook does; it rescanTransportTicket and updates state. 【F:src/hooks/useTransportTimeline.ts†L136-L145】

So the replacement plan above explicitly covers:

storage typed errors,

rescan errors* no-segment guard,

UI toast ownership,

backward-compatible helper aliases,

stronger tests,

production Supabase readiness,

clean module responsibilities.

Commands I used

✅ git status --short --branch && nl -ba src/lib/transportRescan.ts | sed -n '1,80p' && nl -ba src/lib/transportScanStorage.ts | sed -n '1,90p' && nl -ba src/hooks/useTransportTimeline.ts | sed -n '135,165p' && nl -ba src/components/TicketDetailSheet.tsx | sed -n '285,315p'StorageError/fetchScanImagesAsData`..

2 Commit all code changes Gitable Ensureabase required a valid if extraction returns no segments.

Keep architecture:

helper handles storage-specific errors - helper domaincan errors;

-/hook layer handles-facing toasts remainstransportStoreanned durable theyognito login- localStorage-data device id regeneration previous implementation added persistence source image badges. The storage helperTransportScanUrls, notScanImagesDataorScanStorage. Show provider / confidence / detected language for scanned tickets.

. Add a per-ticket Recan action using ADD COLUMN NOT OR extraction ('openai 'ini NOT_conf,tractionidence NULLtraction AND_confidence1 detected_language ADD COLUMN IF, ``, _at ('txt<auth.uid device:Id>><ticketId->.

:

```550e8400-e29b-41d4-a716-446655440000/8c7...ticket.../bucket_id =transport-sc`, and

. one of is true:

first folder segmenttext first 'device ||-device-id;

authenticated via `public_role user- not or public.

ini";

interfaceExtractionMetadata {

provider: ExtractionProvider confidence?: |;

detectedLanguage translated boolean;

run?: string | null ` {

existing fields...

extraction?: TicketMetadata | null sourceImagePaths?:}

Rules:

- Manual-entrymanualanned badges.

---

. Store mapping

Updat`src/lib/Store.ts`

##1 `ticket```ts

extraction_provider: ticket.extractionprovider,

extraction_confidence:

  typeof ticket.ex === ticket?.detLanguage ?? null,

traction_translated Boolean(ticket.ex:,

        rowtraction_conf == null ? nullidence),

      detectedLanguage: row.detected_language ?? null,

      translated Boolean(row.extractionlated),

      runAt:.ex ?? null    [nullsourcePaths.is](http://nullsourcePaths.is)(row_paths_paths [],

:

not break rows.

-- existing-in user/device.

ident ticket# D Storage |"

"

read";

classStorageError message code:Error cause unknown,

) {

super .name = "ScanStorageError";

}

 |  deviceId |;

):Rules:

- Prefer `- Throw` ScanStorageError, "invalid-url")`.

- Do wrap in.

 D helper

exportScan : user null?: ticketId dataUrls: stringBehavior:

-Urls 0 `[]`.

- Resolve.

 Upload to```<ownerPrefix>/<ticket `(messageupload",.

## D Back-compatible aliasIf calls `TransportScanImages keep it ats functionImages paths):<string``Behavior)- On FileReader/read failure, throw `ScanStorageError(message, "read",)`.

## D8. Backward aliasIf code calls `downloadTransportScan`, keep:

```ts

 constScanDataUrls fetchScan;

This prevents and accidental import breakage.

#. Scanner payload

Update:

`/screens/Wizard.ts: {

extracted.provider confidence.confidence null detected: extracted.detectLanguage ?? null translated: Boolean Image3tsPaths awaitScanImages(

userId deviceId ticketId },

[ticket.id](http://ticket.id) ScanDo not silently failure.

G. Typed re-scan helper

/update:

src/libRescan- module not It throw UIook handles. Error

ts

export ResError | " |-images"

| ""

| "extraction | "save"

| "unknown";

class Res constructor: ?: {

);

= }

``

res TransportTicket scope: Ticket`

No an3 invalid```ifmanual Rescancanmanualconst.sourcePaths ?? [];

ifpaths 0) {

throw new RescanErrorNo source images stored-images");

}

Do not require `ticket.extraction?.provider to ifsourceImagePaths` exist. Some previously tickets images but. Images the for recan G stored

ts

letized {

 = throw newcan error Error error : "ex   ,

}

##-leg response

const outboundSegments =.[rawOutbound.map](http://rawOutbound.map)((raw) =>

parsedSegment(raw, "outbound index),

);

constSegments [extractedReturn.map](http://extractedReturn.map)((, index) =>

LegToSegmentreturn",),

);

ifout.length return === 0) {

throw RescanErrorExtraction segments",ex");

 must `TicketPres:

-source:

-out- `Segments`

 `pass--` -At:

tsconst Date().ISOString.deviceId scopeId,

 Id: ticket.userId scope.userId null,

 At: ticket.createdType,

ToTimeline:Timeline saveMedicalRecords:MedicalRecords,

   passengerPassport: extracted.passport  bookingReference:

Segments]?.pn ||

   Segments[pn ||

: extracted.provider confidence:.confidence ?? null   Language:.detect ??    translated: Boolean(extracted    run:,

 },

 ,

##.```tstry} ( ResError(

 :",

   save,

 );

}

`

. hook:

`/useres Promise<TransportTicket>

Behavior:

Find id.

2 not found, a normal or go this hook. Prefer UI-level toast inDetail`.

#. UI toast handlingDetailSheet.tsxThe sheet currently starts/stops spinner in /finally. must errors and.

##1 toast

`onRescan(ticket updated ticket:

const extraction = ·confidence)} · ${tractionLanguage "`

 : I2. toast

Catch `ResError` and show message by code:

```ts

const صورح مت",

 storage scan images · صورToast:

toasterror.code]Byunknown, Please again If مرة أخرى errorError.

## I safety.

13 files changed

+427

-4

Undo

Review

docs/[data-model.md](http://data-model.md)

+6

-0

src/components/TicketDetailSheet.tsx

+45

-1

src/components/TransportCard.tsx

+29

-0

src/hooks/useTransportTimeline.ts

+13

-0

src/lib/__tests__/transportRescan.test.ts

+76

-0

src/lib/transportRescan.ts

+55

-0

src/lib/transportScanStorage.ts

+68

-0

src/lib/transportStore.ts

+14

-0

src/lib/transportTickets.ts

+12

-0

src/screens/JourneyScreen.tsx

+28

-3

src/screens/ScannerWizard.tsx

+8

-0

src/screens/__tests__/ScannerWizard.e2e.test.tsx

+6

-0

supabase/migrations/20260512120000_transport_scan_metadata.sql

+67

-0

&nbsp;