
## Goal

Stop pretending we can generate a real boarding pass. Instead, push the user to do online check-in 24h before the flight and upload the real boarding pass — one per traveler (passenger + companions) on each flight segment.

## What's there today

- `src/components/TicketDetailSheet.tsx` renders a **fake boarding pass**: a `BoardingBarcode` SVG block plus a prominent "Save Boarding Pass" export button (via `html2canvas`) and a "Save as Image / Download boarding pass" entry in the share menu. This is the "auto-generated boarding pass" the user is complaining about — it never matches the real one.
- The flight `sys-*` Smart Reminders already include `sys-checkin` at 1440 min (24h) labelled "Online check-in opens", and `sys-boarding` at 45 min.
- `RelatedDocumentsCard` already supports per-segment durable uploads via `transport_attachments` (RLS-protected, user_id + device_id + ticket_id + segment_ref, with thumbnails + scanner flow). Common labels today: VISA, Passport, Insurance, Hotel, Other. Subcategory schemas exist for those.
- DB check: zero `transport_attachments` rows have label/subcategory containing "boarding". The "auto-generated boarding pass" only existed visually in the sheet — there's **nothing to delete in the database**.
- Flight ticket model has `passengerName` plus companion info shown in `FlightTicketCard` ("Each companion shares the same gate, boarding pass…").

## Changes

### 1. Remove the fake boarding pass (UI only)

`src/components/TicketDetailSheet.tsx`:
- Delete the `BoardingBarcode` SVG component and the `hasBarcode` block that renders "BOARDING PASS BARCODE / Present this at the gate".
- Remove the bottom "Save Boarding Pass" export button and `handleExport` (also the share-menu "Save as Image · Download boarding pass" entry that calls it). Drop unused `html2canvas` import and `captureRef`, `isExporting`.
- Remove the quick-note suggestion "📱 Download boarding pass".
- The share menu keeps WhatsApp / Email / Copy Text (textual share only).

### 2. Replace it with a clear 24h reminder + disclaimer

`src/components/TicketDetailSheet.tsx`, flight branch of `getSystemReminders`:
- Relabel `sys-checkin` (1440 min) → **"Check-in opens — do online check-in & upload your real boarding pass"** / Arabic: **"يفتح تسجيل الوصول — أكمل التسجيل الإلكتروني وارفع بطاقة الصعود الفعلية"**, icon ✅. Keep `minutesBefore: 1440`.
- Add a new always-visible **disclaimer card** at the top of the Details tab for flight tickets:
  - EN: "RufayQ doesn't issue boarding passes. 24 hours before each flight, do online check-in with your airline and upload the real boarding pass below — one per traveler."
  - AR: "لا يُصدر رفيق بطاقات الصعود. قبل 24 ساعة من كل رحلة، أكمل تسجيل الوصول مع شركة الطيران وارفع بطاقة الصعود الفعلية أدناه — لكل مسافر."
  - Styled with the existing warning-card visual language (gold border, AlertTriangle icon).

### 3. Real boarding-pass upload slot per traveler

`src/components/RelatedDocumentsCard.tsx`:
- Add `"Boarding Pass"` to `COMMON_LABELS` (first position) and map it in `LABEL_TO_SUBCATEGORY` → `"Boarding Pass"` so the scanner picks a simple schema (no Visa lock-in).
- Default `labelDraft` to `"Boarding Pass"` when the parent segment is a flight (pass an optional `defaultLabel` / `preferredLabels` prop from `JourneyScreen`).

`src/screens/JourneyScreen.tsx`:
- Where `RelatedDocumentsCard` is rendered for a flight (line ~1577), build a roster of travelers from the ticket: `passengerName` + companion names. Render one `RelatedDocumentsCard` per traveler with:
  - `segmentRef = "${seg.id}::${travelerSlug}"`
  - `title = "Boarding pass — {travelerName}"` / "بطاقة الصعود — {الاسم}"
  - `preferredLabels = ["Boarding Pass", ...COMMON_LABELS]`
- Keep the existing un-scoped card below (for VISA/Passport/etc.) but rename its title to "Other travel documents · مستندات سفر أخرى" so it's clearly separate from boarding passes.

### 4. Data cleanup for existing users

No migration required. The fake boarding pass was never persisted (no `transport_attachments` rows match `%boarding%`; nothing in storage). Removing the UI in step 1 fully "deletes" it for everyone on their next app load.

If any user did manually save the rendered image to their device, that file is on their phone's gallery and is out of scope — the in-app surface that produced it is gone.

### 5. Copy touch-up

`JourneyScreen.tsx` line 1607 footer text stays ("Or scan a boarding pass / booking confirmation") — that flow scans an existing real document into the system, which is exactly what we now want.

## Technical notes

- No DB schema change, no migration, no edge function change.
- Files edited: `src/components/TicketDetailSheet.tsx`, `src/components/RelatedDocumentsCard.tsx`, `src/screens/JourneyScreen.tsx`.
- Subcategory `"Boarding Pass"` is a free-form string in `transport_attachments.subcategory`; no enum to update.
- Per-traveler scoping via a composite `segment_ref` keeps existing RLS policies intact and survives ticket replace because each card still passes `ticketId` (read query is `(segment_ref OR ticket_id)` — see comment block above `RelatedDocumentsCard`).
- Companion source: read from the flight `TransportTicket` already passed into `TicketDetailSheet`/cards; if a ticket has no companions, only one card renders (for the passenger).
