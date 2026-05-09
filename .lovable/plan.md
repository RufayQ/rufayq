# RufayQ — Scanner → Journey Pipeline + Manual Entry

# 6 Slices — Complete Implementation Prompt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SLICE 1 — PDF Scoring Performance Tuning

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files: src/lib/pdfToImages.ts

       src/lib/__tests__/pdfScoring.test.ts (extend, do not rewrite)

### 1.1 — Named Configuration Constants

At the top of pdfToImages.ts, define a single config object so all 

tunable values are in one place and never need hunting:

const PDF_SCORING_CONFIG = {

  MAX_PAGES_ANALYZED: 25,        // hard cap on pages rendered for scoring

  ANALYSIS_RENDER_SCALE: 0.6,    // thumbnail scale for scoring pass only

  OCR_RENDER_SCALE: 2.0,         // full scale for pages sent to OCR

  IMAGE_SAMPLE_STRIDE: 4,        // sample every Nth row/col in image scoring

  EARLY_EXIT_MIN_CHARS: 40,      // skip image scoring if text < this length

  SAMPLE_FIRST_N: 5,             // pages always included from start

  SAMPLE_LAST_N: 3,              // pages always included from end

} as const;

No magic numbers anywhere in the file — all values reference this object.

### 1.2 — Large PDF Sampling

When totalPages > MAX_PAGES_ANALYZED:

- Always include pages 1..SAMPLE_FIRST_N and 

  (totalPages - SAMPLE_LAST_N + 1)..totalPages.

- Fill remaining slots with evenly strided pages across the middle,

  stride = Math.ceil(middlePageCount / remainingSlots).

- Return sampled page indices as a sorted deduplicated array.

- Do NOT change the public signature of analyzePdfPages() or

  recommendPages() — sampling is an internal implementation detail.

### 1.3 — Render Scale Separation

Analysis (scoring) pass: use ANALYSIS_RENDER_SCALE (0.6).

OCR pass (renderPdfPagesAtScale): use OCR_RENDER_SCALE (2.0).

These are already separate code paths — just enforce the constants.

### 1.4 — Strided Image Scoring

In scoreFlightImage, replace the per-pixel loop with:

  for (let row = 0; row < height; row += IMAGE_SAMPLE_STRIDE)

    for (let col = 0; col < width; col += IMAGE_SAMPLE_STRIDE)

Produces ~16x fewer reads; statistically equivalent top-page selection.

### 1.5 — Text Extraction Memoization

Memoize per-page text extraction using a WeakMap keyed on the PDF page

reference. recommendPages must not re-score during preview re-renders.

### 1.6 — Early Exit for Blank/Cover Pages

Before calling scoreFlightImage on a page:

- If extractedText.length < EARLY_EXIT_MIN_CHARS AND

  no IATA airport code pattern found in extractedText:

  skip image scoring, assign score 0, continue to next page.

### 1.7 — New Tests (extend pdfScoring.test.ts)

Add inside existing describe blocks — do not restructure:

a) Large PDF sampling:

   - Synthetic 60-page doc → assert sampled page count ≤ MAX_PAGES_ANALYZED.

   - Known flight page at position 32 of 60 → assert it is included 

     in the sampled set (middle-stride coverage check).

b) Strided scoring parity:

   - Run scoreFlightImage with stride=1 (full) and stride=4 (sampled) 

     on the existing scanned-PDF fixture.

   - Assert both return the same top-picked page index.

c) Config constant smoke test:

   - Assert PDF_SCORING_CONFIG.ANALYSIS_RENDER_SCALE < 1.0

   - Assert PDF_SCORING_CONFIG.OCR_RENDER_SCALE >= 1.5

   (Prevents accidental swap of the two scales.)

d) Early exit coverage:

   - A page with 10-char text and no IATA tokens → scoreFlightText 

     returns 0 without calling scoreFlightImage (spy assertion).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SLICE 2A — Data Model + parseFlightJourney()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

New file: src/lib/flightJourney.ts

New file: src/lib/__tests__/flightJourney.test.ts

### 2A.1 — Canonical Types

export type SeatClass = "Economy" | "Business" | "First";

export type JourneyLeg = {

  id: string;                    // stable uuid — never regenerated on re-render

  airline?: string;

  airlineCode?: string;          // IATA 2-letter e.g. "SV", "EK"

  flightNumber?: string;

  bookingRef?: string;

  from: { code: string; city: string; airport?: string };

  to:   { code: string; city: string; airport?: string };

  departureDateTime: string;     // ISO 8601 local time e.g. "2026-04-05T08:30"

  arrivalDateTime?: string;

  durationMinutes?: number;

  seatClass?: SeatClass;

  seatNumber?: string;

  isConnection: boolean;         // true = leg is a stopover within same PNR

  layoverMinutes?: number;       // minutes until next leg departs (set on prev leg)

  confidence?: number;           // 0-1, from OCR confidence score

};

export type FlightJourney = {

  id: string;                    // stable uuid for the whole journey

  tripType: "one_way" | "round_trip" | "multi_city";

  legs: JourneyLeg[];            // ALL legs sorted chronologically

  passenger?: { name?: string; passport?: string };

  source: "ocr" | "manual" | "ocr_assisted";

  sourceDocId?: string;          // links to scanned document record

  sourceDocFilename?: string;    // original filename e.g. "Alaa_ticket.pdf"

  sourceDocThumbnailUrl?: string; // pre-signed URL to first page thumbnail

  overallConfidence?: number;    // avg confidence across legs, OCR only

  createdAt: string;             // ISO timestamp

};

export type ParseResult = {

  journey: FlightJourney;

  droppedLegs: { raw: unknown; reason: string }[];

};

### 2A.2 — validateFlight()

Define in flightJourney.ts (do NOT assume it exists elsewhere):

export function validateFlight(leg: Partial<JourneyLeg>): {

  valid: boolean;

  errors: string[];

}

Validation rules:

- from.code required, must be 3 uppercase letters (IATA format)

- to.code required, must be 3 uppercase letters

- from.code !== to.code

- departureDateTime required, must parse as valid ISO date

- if arrivalDateTime present, must be >= departureDateTime

- flightNumber if present must match /^[A-Z0-9]{2,3}\s?\d{1,4}$/

### 2A.3 — parseFlightJourney()

export function parseFlightJourney(

  raw: {

    outbound?: unknown;

    return?: unknown;

    legs?: unknown[];

    passenger?: unknown;

    tripType?: string;

  },

  source: "ocr" | "manual" | "ocr_assisted",

  meta?: {

    sourceDocId?: string;

    sourceDocFilename?: string;

    sourceDocThumbnailUrl?: string;

    overallConfidence?: number;

  }

): ParseResult

Normalization pipeline per leg:

1. Call normalizeParsedLeg() from src/lib/flightParsing.ts 

   (verify it exists; if not, implement basic normalization inline:

   trim strings, uppercase airport codes, normalize date formats).

2. Call validateFlight() on the normalized leg.

3. If valid: include in legs[]. If invalid: push to droppedLegs[].

4. Set isConnection = false initially; compute in step below.

Connection detection (run after all legs collected):

For each adjacent pair legs[i], legs[i+1]:

  if legs[i].to.code === legs[i+1].from.code AND

     timeDiffMinutes(legs[i].arrivalDateTime, legs[i+1].departureDateTime) < 1440:

    legs[i].isConnection = true

    legs[i].layoverMinutes = timeDiffMinutes(...)

Sort all legs by departureDateTime ascending.

tripType inference (applied AFTER sorting):

1. legs.length === 1 → "one_way"

2. legs.length === 2 AND

   legs[1].to.code === legs[0].from.code AND

   legs[1].from.code === legs[0].to.code → "round_trip"

3. raw.tripType === "round_trip" explicitly set → honour it

   (user may have declared it in manual entry)

4. Otherwise → "multi_city"

Confidence threshold:

If source === "ocr" AND meta.overallConfidence < 0.55:

  Add a warning flag journey._lowConfidence = true

  (consumed by Slice 3 to decide whether to open manual form)

### 2A.4 — Tests (flightJourney.test.ts)

Cover all of:

- Single outbound leg → tripType "one_way", legs.length === 1

- Outbound + return (reversed routing) → tripType "round_trip",

  legs[0].from.code === legs[1].to.code

- Two legs same direction, shared connection city → isConnection true,

  layoverMinutes > 0, tripType "one_way"

- Three legs, non-reversed → tripType "multi_city", legs.length === 3

- Malformed leg (missing from.code) → droppedLegs.length === 1,

  journey.legs.length === remaining valid legs

- Leg sort: legs provided out of order → sorted by departureDateTime

- source "manual" → journey.source === "manual"

- source "ocr" with overallConfidence 0.3 → _lowConfidence === true

- source "ocr" with overallConfidence 0.8 → _lowConfidence falsy

- meta fields propagated: sourceDocId, sourceDocFilename, 

  sourceDocThumbnailUrl all present on returned journey

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SLICE 2B — JourneyTimeline UI Component

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

New file: src/components/JourneyTimeline.tsx

Pure presentational component — no data fetching, no side effects.

### 2B.1 — Props

interface JourneyTimelineProps {

  journey: FlightJourney;

  editable?: boolean;            // true = tap-to-edit mode

  onEditLeg?: (legId: string) => void;

  compact?: boolean;             // true = collapsed single-line card

}

### 2B.2 — Design Tokens

Use existing project tokens throughout. Reference only:

  Primary:  --color-teal-deep  (header spine, dots)

  Accent:   --color-gold       (layover connector, badges)

  Surface:  --color-white      (card background)

  Text:     --color-text-primary / --color-text-secondary

  Danger:   --color-red-soft   (overnight layover warning)

  Radius:   16px cards, 8px chips

  Shadow:   0 2px 12px rgba(0,0,0,0.08)

### 2B.3 — Header Summary Strip

Always rendered at the top of JourneyTimeline:

ONE-WAY / STOPOVER:

┌───────────────────────────────────────────┐

│  RUH  ──────── ✈ ────────  LHR            │

│  Riyadh                    London         │

│  Apr 5  ·  SV 301  ·  Business  ·  1 stop│

└───────────────────────────────────────────┘

ROUND TRIP:

┌───────────────────────────────────────────┐

│  RUH ──✈── LHR     ↩     LHR ──✈── RUH   │

│  Riyadh  London          London  Riyadh   │

│  Apr 5  ·  SV 301        Apr 19 ·  SV 302 │

└───────────────────────────────────────────┘

MULTI-CITY:

┌───────────────────────────────────────────┐

│  JED → CAI → IST → JED                    │

│  3 legs  ·  Apr 5 – Apr 12                │

└───────────────────────────────────────────┘

### 2B.4 — Trip Type Visual Differentiation

ROUND TRIP (tripType === "round_trip"):

  Render two clearly labeled sections separated by a full-width divider:

  ── ✈ OUTBOUND ──────────────────────────

  [leg card(s) for outbound direction]

  ── ↩ RETURN ────────────────────────────

  [leg card(s) for return direction]

  "Outbound" legs = all legs where index < midpoint

  "Return" legs = all legs from midpoint onward

  Midpoint = legs.findIndex(l => [l.to](http://l.to).code === legs[0].from.code)

MULTI-CITY (tripType === "multi_city"):

  Render legs numbered sequentially with no directional headers:

  "Leg 1", "Leg 2", "Leg 3" — gold numbered badge top-left of each card.

ONE-WAY / STOPOVER:

  No section headers. Render legs directly with connection connectors

  between them where isConnection === true.

### 2B.5 — Per-Leg Card Layout

┌──────────────────────────────────────────────┐

│ [Logo 32px]  SAUDIA              SV 301       │

│              ─────────────────────────────    │

│  08:30    ══════════✈══════════   13:55       │

│  RUH          6h 15m  Direct      LHR         │

│  Riyadh                           London      │

│                                               │

│  Apr 5, 2026  ·  Business  ·  Seat 14C        │

│  PNR: AB1234                                  │

└──────────────────────────────────────────────┘

Flight path animation: on mount, a small plane icon slides 

left-to-right along the dashed path line using a CSS keyframe 

animation (duration 1.2s, ease-in-out). 

Respects prefers-reduced-motion: if set, show static plane at midpoint.

Airline logo: resolve from airlineCode using the static map in 

src/lib/airlineLogos.ts (create file if it doesn't exist).

Map must include at minimum: SV, EK, EY, QR, MS, TK, LH, G9, PC, FZ, WY, GF.

Fallback: generic airplane icon if code not in map.

### 2B.6 — Timeline Spine

Left edge of all leg cards shares a continuous vertical spine:

  ● (filled teal circle — origin of first leg)

  │

  │ [Leg 1 card]

  │

  ◆ (filled gold diamond — connection/stopover point)  ← only if isConnection

  │

  │ [Leg 2 card]

  │

  ● (filled teal circle — final destination)

### 2B.7 — Layover Connector

Between connected legs (isConnection === true):

  │

  ├─ 🕐  Layover in DOH  —  2h 35m                (< 12h: muted gold text)

  ├─ 🕐  Long layover in DOH  —  14h 10m           (> 12h: amber text + badge)

  ├─ 🌙  Overnight stop in DOH  —  26h 00m         (> 24h: red text + badge)

  │

### 2B.8 — Language & Translation Strip

Rendered below the last leg card, above the document chip:

  🌐  Language: Arabic → English    ✓ Translated

  OR

  🌐  Language: English

Rules:

- sourceLanguage and wasTranslated come from FlightJourney

  (set by the OCR parser, NEVER hardcoded in the component).

- Only show "Translated" badge when wasTranslated === true.

- If source === "manual": omit this strip entirely.

### 2B.9 — Document Source Chip

Rendered at the very bottom of JourneyTimeline 

when journey.sourceDocFilename is present:

  📎  Alaa_Alhangour_ticket.pdf    [Preview ↗]

"Preview" opens the original PDF in a full-screen bottom sheet 

viewer using journey.sourceDocThumbnailUrl as the cover image 

and sourceDocId to fetch the full document.

When source === "manual": show  ✏ Entered manually  instead.

When source === "ocr_assisted": show  🔍 OCR + Manual  instead.

### 2B.10 — Tap-to-Edit Mode

When editable === true:

- Every field in every leg card shows a subtle pencil icon on hover/focus.

- Tapping any field replaces it with a styled inline input:

    Text fields → <input type="text" />

    Dates → shadcn DatePicker

    Times → <input type="time" />

    Class → shadcn Select (Economy / Business / First)

- Input is pre-filled with current value.

- On blur or Enter: reverts to display mode with updated value.

- onEditLeg(legId) fires when any field in that leg is edited.

- Show a floating toast "Changes saved locally" after each edit.

- Edited fields get a subtle teal underline to indicate they were 

  manually modified from OCR original.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SLICE 2C — Scanner → OCR → Save Pipeline Wiring

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files: src/screens/ScannerWizard.tsx

       src/screens/JourneyScreen.tsx (or equivalent transport store)

### 2C.1 — OCR State Machine

Replace any boolean isOcrFailed flags with an explicit enum:

type OcrStatus = "idle" | "scanning" | "success" | "partial" | "failed";

Transitions:

  idle → scanning: user confirms page selection

  scanning → success: invoke returns 2xx AND overallConfidence >= 0.55

  scanning → partial: invoke returns 2xx BUT overallConfidence < 0.55

  scanning → failed: invoke returns non-2xx OR network error

  failed → scanning: user taps "Try OCR again"

  partial → scanning: user taps "Try OCR again"

Conditional rendering by state:

  idle:     show upload prompt only

  scanning: show loading spinner only

  success:  show JourneyTimeline (editable=true) + Save section

  partial:  show JourneyTimeline (editable=true, fields tinted amber) +

            warning banner "Some fields may be inaccurate — please review"

            + Save section + "Correct manually" link

  failed:   show error card + "Try OCR again" + "Enter details manually"

            NOTHING ELSE — no timeline, no save section

### 2C.2 — OCR Result → ParsedJourney

After successful OCR invoke:

1. Extract meta from scan context:

   meta = {

     sourceDocId: [uploadedDoc.id](http://uploadedDoc.id),

     sourceDocFilename: uploadedDoc.filename,

     sourceDocThumbnailUrl: uploadedDoc.thumbnailUrl,

     overallConfidence: ocrResponse.confidence,

   }

2. Call parseFlightJourney([ocrResponse.data](http://ocrResponse.data), "ocr", meta).

3. If parseResult.droppedLegs.length > 0: log to console, 

   show a subtle inline warning per dropped leg 

   "1 leg could not be read — enter it manually".

4. If journey._lowConfidence: set ocrStatus = "partial".

5. Otherwise: set ocrStatus = "success".

6. Pass journey to <JourneyTimeline journey={journey} editable={true} />.

### 2C.3 — Save to Journey Map

"Save to RufayQ" button calls onSave(journey: FlightJourney).

In the Journey screen / transport store, on receiving a FlightJourney:

a) Deduplication:

   For each incoming leg, check existing stored legs for match:

   existing.flightNumber === leg.flightNumber AND

   existing.departureDateTime === leg.departureDateTime

   If match found: skip that leg (do not duplicate).

b) Storage tagging:

   Attach to each stored journey:

   documentSource: journey.source === "ocr" ? "OCR Scanned" :

                   journey.source === "ocr_assisted" ? "OCR + Manual" :

                   "Manual Entry"

c) Journey card placement by tripType:

   "one_way" or "multi_city":

     Append to transport segments in chronological order.

   "round_trip":

     Create a single linked journey entry with:

     - going: legs where [leg.to](http://leg.to).code !== legs[0].from.code 

               (or first half by midpoint logic from 2B.4)

     - return: remaining legs

     Displayed as one card with both directions.

d) Post-save navigation:

   Navigate to Transport Timeline screen.

   Auto-scroll to the newly saved journey card.

   Apply a gold pulse animation (1.5s) to the card on arrival:

   @keyframes goldPulse {

     0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); }

     50%       { box-shadow: 0 0 0 8px rgba(201,168,76,0.4); }

   }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SLICE 2D — Transport Timeline Elite Journey Card

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

New file: src/components/JourneyCard.tsx

Edit: src/screens/JourneyScreen.tsx (or transport timeline screen)

This slice defines how saved FlightJourney entries appear on the 

main Transport Timeline / Journey Map screen — the persistent 

post-save view, distinct from the scanner wizard confirmation.

### 2D.1 — Collapsed Card (default state)

┌──────────────────────────────────────────────┐

│  ✈  Riyadh → London                 Apr 5    │

│     SV 301  ·  Business  ·  Direct           │

│                                  [OCR Scanned]│

│                                           ▼  │

└──────────────────────────────────────────────┘

For round trip:

┌──────────────────────────────────────────────┐

│  ✈  Riyadh ⇄ London          Apr 5 – Apr 19  │

│     SV 301 / SV 302  ·  Business  ·  Return  │

│                                  [OCR Scanned]│

│                                           ▼  │

└──────────────────────────────────────────────┘

For multi-city:

┌──────────────────────────────────────────────┐

│  ✈  JED → CAI → IST → JED    Apr 5 – Apr 12  │

│     3 legs  ·  Mixed Class                   │

│                                  [Manual Entry│

│                                           ▼  │

└──────────────────────────────────────────────┘

Source badge colors:

  "OCR Scanned"  → teal pill

  "OCR + Manual" → teal/gold split pill

  "Manual Entry" → gold pill

### 2D.2 — Expanded Card (tap ▼ to expand)

Renders the full <JourneyTimeline journey={journey} editable={false} />

component inline within the card, including:

- All leg cards with timeline spine

- Layover connectors

- Language / translation strip (if OCR)

- Document source chip with Preview link

Plus an "Edit" button in the card footer:

  [ ✏  Edit journey ]

Tapping opens <ManualFlightEntrySheet> pre-filled with the 

journey's current data, regardless of original entry method.

### 2D.3 — Journey Map Integration

On the Journey Map / roadmap view (if a visual itinerary map exists):

- Each FlightJourney with valid airport codes renders as a 

  route arc on the map between origin and destination cities.

- Round-trip renders as two arcs (outbound teal, return gold dashed).

- Multi-city renders as a connected polyline through all leg cities.

- Tapping a route arc opens the expanded JourneyCard.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SLICE 3 — Manual Entry Fallback + OCR Partial Recovery

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

New file: src/components/ManualFlightEntrySheet.tsx

Edit: src/screens/ScannerWizard.tsx (failed + partial states)

### 3.1 — Failed State UI (ocrStatus === "failed")

Show ONLY:

┌──────────────────────────────────────────┐

│  ⚠  We couldn't read this document       │

│     Please try again or upload a         │

│     clearer version.                     │

│                                          │

│  [  ↺  Try OCR again  ]   (primary btn)  │

│  [  ✏  Enter details manually  →  ]      │

│                    (secondary ghost btn)  │

└──────────────────────────────────────────┘

NOTHING else. No extracted information. No language chip.

No save section. No "Tap any field to edit" hint.

### 3.2 — Partial State Banner (ocrStatus === "partial")

Above the JourneyTimeline in partial state, show:

┌──────────────────────────────────────────┐

│  ⚠  Some fields may be inaccurate        │

│     OCR confidence was low. Please       │

│     review and correct before saving.    │

│                        [Correct manually]│

└──────────────────────────────────────────┘

Fields with confidence < 0.55 are highlighted amber in the timeline.

"Correct manually" opens ManualFlightEntrySheet pre-filled.

### 3.3 — ManualFlightEntrySheet

Renders as a bottom sheet (drag to dismiss) or full-screen modal 

on smaller viewports.

Header: "✈ Add Flight Details"

Sub-header: "Enter your ticket information"

Step 1 — Trip Type segmented control:

  [ One-way ]   [ Return ]   [ Multi-city ]

  Default: "One-way"

Step 2 — Leg Form Block (repeated per leg):

  Each leg block contains these fields in order:

  Airline *

    Searchable dropdown. Options show airline logo + name + IATA code.

    Includes at minimum: Saudia, Emirates, Etihad, Qatar Airways,

    EgyptAir, Turkish Airlines, Lufthansa, Air Arabia, Pegasus,

    flydubai, Oman Air, Gulf Air, flynas + "Other (enter manually)".

  Flight Number *

    Text input. Auto-uppercase. Placeholder: "e.g. SV 301"

    Validate format: /^[A-Z0-9]{2,3}\s?\d{1,4}$/

  From *

    Two sub-fields: Airport Code (3 chars, uppercase, IATA validated)

                    City name (free text)

    Show as: [RUH]  [Riyadh         ]

  To *

    Same structure as From.

  Departure Date *

    shadcn DatePicker. Cannot be in the past (warn, don't block).

  Departure Time *

    <input type="time"> 24h format.

  Arrival Date

    shadcn DatePicker. Auto-suggests same day as departure.

    Must be >= departure date.

  Arrival Time

    <input type="time"> 24h format.

  Cabin Class *

    shadcn Select: Economy / Business / First.

  Seat Number

    Text input, optional. Placeholder: "e.g. 14C"

  PNR / Booking Reference

    Text input, optional. Placeholder: "e.g. AB1234"

Required fields marked with * and validated inline.

Inline red error messages below each invalid field on blur.

### 3.4 — Trip Type Behaviour

ONE-WAY: Single leg block. Submit enabled when leg 1 valid.

RETURN:

  Show two leg blocks: "✈ Outbound" and "↩ Return".

  When Outbound is completed, smart pre-fill Return:

    - From/To swapped from Outbound

    - Same Airline and Class pre-selected

    - Date defaulted to Outbound date + 7 days

  Return departure must be >= Outbound departure.

MULTI-CITY:

  Start with 2 leg blocks. 

  [ + Add another leg ] button — gold, below last leg block.

  Maximum 5 legs total.

  Each leg block (except the first) has a [ × Remove ] button top-right.

  Smart chaining: each new leg's From pre-filled from previous leg's To.

### 3.5 — Pre-fill from Partial OCR

If ManualFlightEntrySheet receives prefillData: Partial<FlightJourney>:

  - Pre-fill all available fields from the first valid/partial leg.

  - Fields that came from OCR get a subtle teal left border + 

    a small "✓ OCR" tag to distinguish from user-typed values.

  - User can edit or confirm any pre-filled field.

### 3.6 — Bilingual Labels (EN/AR)

All form labels render bilingual:

  Primary: English (larger, bold)

  Secondary: Arabic (smaller, below, right-aligned)

  Example:

    Airline  *

    شركة الطيران

When app/device language is Arabic:

  - Form layout mirrors to RTL (use dir="rtl" on the form container).

  - Labels show Arabic primary, English secondary.

  - DatePicker locale set to ar-SA.

  - Time input remains 24h format regardless of locale.

Airport search results show city names in both EN and AR where 

available in the airport data source.

### 3.7 — Submit Flow

1. Validate each leg via validateFlight().

   Show per-leg error summary at top of leg block if invalid.

   "Submit" button disabled until ALL legs valid.

2. Build raw shape from form state.

3. Call parseFlightJourney(rawShape, source, meta) where:

   source = "manual" if no prefill, "ocr_assisted" if prefill used.

   meta.sourceDocId/Filename passed through if available.

4. Pass resulting FlightJourney to JourneyTimeline for confirmation 

   preview (same component as OCR success step — NO code duplication).

5. Patient reviews the timeline preview, then taps 

   "Save to RufayQ →" — calls same onSave() as Slice 2C.

6. Journey screen stores with appropriate documentSource tag.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SLICE 4 — End-to-End Wizard Tests

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

New file: src/screens/__tests__/ScannerWizard.e2e.test.tsx

Uses @testing-library/react + userEvent.

### 4.1 — Mocks

Mock A — supabase.functions.invoke('scan-itinerary'):

  successResponse: { data: { outbound: {...}, confidence: 0.85 }, error: null }

  partialResponse: { data: { outbound: {...}, confidence: 0.40 }, error: null }

  failureResponse: { data: null, error: { message: "non-2xx", status: 500 } }

Mock B — pdfToImages (analyzePdfPages, renderPdfPagesAtScale):

  Return synthetic 3-page PDF data; do not load real PDF.js.

  Pages: [coverPage, flightPage, termsPage] with pre-set scores [0, 95, 5].

Mock C — DO NOT MOCK analyzePdfPages for the integration test in 4.7.

### 4.2 — Scenario 1: Multi-page PDF happy path

- Upload 3-page PDF mock.

- Assert analyze step renders 3 thumbnails with scores.

- Assert flightPage is auto-selected (highest score).

- Confirm selection → OCR invoke called with flightPage data URL.

- successResponse returned → ocrStatus === "success".

- Assert JourneyTimeline renders with correct leg data.

- Assert source document chip shows mock filename.

- Click "Save to RufayQ" → assert onSave called with 

  FlightJourney where source === "ocr" and legs.length >= 1.

### 4.3 — Scenario 2: Manual page selection override

- Same setup as 4.2.

- User unchecks auto-recommended page, selects termsPage instead.

- Assert OCR invoke called with termsPage data URL (not flightPage).

### 4.4 — Scenario 3: OCR failure → manual entry

- failureResponse returned → ocrStatus === "failed".

- Assert JourneyTimeline NOT in DOM.

- Assert save section NOT in DOM.

- Assert "We couldn't read this document" message visible.

- Assert both CTAs present: "Try OCR again" and "Enter details manually".

- Click "Enter details manually" → ManualFlightEntrySheet opens.

- Fill all required fields for a one-way flight.

- Click submit → JourneyTimeline preview renders with entered data.

- Click "Save to RufayQ" → onSave called with 

  FlightJourney where source === "manual".

### 4.5 — Scenario 4: OCR failure → retry → success

- First invoke: failureResponse.

- Click "Try OCR again" → second invoke triggered.

- Second invoke: successResponse.

- Assert ocrStatus becomes "success", JourneyTimeline renders.

### 4.6 — Scenario 5: Round-trip manual entry

- Open ManualFlightEntrySheet.

- Select "Return" trip type.

- Assert second leg block appears.

- Fill outbound leg → assert return leg From/To pre-filled (swapped).

- Fill remaining return fields.

- Submit → onSave called with FlightJourney where 

  tripType === "round_trip" AND legs.length === 2.

### 4.7 — Scenario 6: Partial OCR confidence

- partialResponse (confidence 0.40) returned.

- Assert ocrStatus === "partial".

- Assert warning banner visible.

- Assert JourneyTimeline renders (partial data shown).

- Assert save section visible.

- Assert "Correct manually" link visible.

### 4.8 — Integration Test (non-mocked PDF scoring)

DO NOT mock analyzePdfPages here.

Use a real synthetic 3-page in-memory PDF built via pdf-lib 

(or equivalent) with text "Flight SV 301 RUH→LHR" on page 2.

Assert recommendPages returns [2] (1-based).

This guards against Slice 1 scale/sampling regressions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FILE MANIFEST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATED:

  src/lib/flightJourney.ts

  src/lib/airlineLogos.ts

  src/lib/__tests__/flightJourney.test.ts

  src/components/JourneyTimeline.tsx

  src/components/JourneyCard.tsx

  src/components/ManualFlightEntrySheet.tsx

  src/screens/__tests__/ScannerWizard.e2e.test.tsx

EDITED:

  src/lib/pdfToImages.ts                 (Slice 1 perf + config constants)

  src/lib/__tests__/pdfScoring.test.ts   (Slice 1 new test cases)

  src/screens/ScannerWizard.tsx          (OcrStatus enum, manual CTA, wiring)

  src/screens/JourneyScreen.tsx          (consume FlightJourney, dedupe, tags)

&nbsp;