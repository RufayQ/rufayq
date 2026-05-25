## Scope

Four related fixes around the Journey → Tickets card and the linked record actions sheet (the one you screenshotted).

---

## 1. Fix "Tap for details" on the flight card

**Symptom:** Tapping the teal flight card (or its "Tap for details →" pill) does nothing.

**Likely cause:** `TicketDetailSheet` was edited in the previous turn (boarding-pass removal, disclaimer card added). The `setSelectedSeg` call in `JourneyScreen.tsx` still fires, but the sheet either throws on render (broken JSX after the `BoardingBarcode` removal) or its overlay is mounted under the `RelatedDocumentsCard` per-traveler stack and never visible. I'll reproduce in the browser, read the console, then:
- Verify the `onTap` handler runs (add a one-shot toast guard if needed during diagnosis, removed before commit).
- Re-check `TicketDetailSheet.tsx` for any dangling refs/state from the boarding-pass removal (`captureRef`, `isExporting`, unused imports) and fix render errors.
- Ensure the sheet uses the shared `OverlayLayer` z-index so it sits above the new per-traveler boarding-pass cards.

**E2E sweep on all milestone-related buttons** (Journey tab):
- Flight/Train/Car/Hotel card body tap → detail sheet opens
- "Tap for details →" pill (make it `pointer-events-none` since the whole card is the hit target — avoids double-fire)
- Replicate (past tickets), Add Transport, Add Accommodation, Scan ticket
- Per-traveler "Boarding pass — {name}" card upload/preview
- "Other travel documents" card upload/preview
- Home-screen milestone canvas → "Tap for details" routes to `journey?milestone:{id}` and the Journey screen scrolls/highlights the matching ticket

Each path verified with a browser interaction; failures fixed inline.

---

## 2. Capture per-leg flight duration

Today `JourneyTimeline` shows Departs/Arrives and a layover pill, but the **flight duration itself** (1h 30m / 4h 15m in your itinerary screenshot) is not displayed.

Changes in `src/components/JourneyTimeline.tsx`:
- Compute `durationMinutes = arrival − departure` per leg using the existing `formatDuration` helper from `@/lib/flightJourney`.
- Render it inline on the collapsed row (next to flight number) and as a dedicated "Duration" detail row when expanded.
- Show it on the flight `TransportCard` mid-section too (between origin/destination), styled like the existing layover pill but in gold-on-teal.
- Add unit tests in `src/lib/__tests__/flightJourney.duration.test.ts` for the new `legDuration` helper if extracted.

Edge case: when arrival < departure (overnight, timezone gap), still compute on absolute timestamps — `Date.parse` already handles the ISO zone suffix used by the extractor.

---

## 3. Redesign the flight-ticket Share UI

Replace the current plain-text WhatsApp/Email/Copy share with an **image-of-the-ticket** share that mirrors the in-app card (the teal DMM → SHJ card in your screenshot).

In `TicketDetailSheet.tsx` (Share menu):
- New primary action: **"Share as image"** — renders a hidden 1080×1350 React node styled exactly like the in-app `TransportCard` (origin/destination, dates, PNR/seat, RufayQ wordmark footer), captured via `html2canvas` (already a dep), then `navigator.share({ files: [...] })` with text fallback to download.
- Secondary action: **"Include short link to original document"** — a toggle (default OFF). When ON and the ticket has an attached PDF in `transport_attachments`, generate a 7-day signed URL and shorten via a new lightweight `shorten-link` edge function (stores the long URL keyed by a short code in a new `short_links` table; returns `https://rufayq.com/s/{code}`).
- Existing WhatsApp / Email / Copy options stay, but consume the new image + optional short link.
- Privacy: short-link generation is gated by the user toggle in the share sheet (one-time, per-share). No auto-generation.

Backend (only if user approves option B short links): one migration for `public.short_links (code text pk, url text, user_id uuid, expires_at timestamptz)` with RLS (owner-only read/write, public read by code via security-definer RPC) and a `shorten-link` edge function.

---

## 4. Expand record "Edit" beyond just renaming

Right now the actions sheet for a flight-ticket record (screenshot 4) only allows **Edit name**. You want full edit of the underlying milestone/ticket.

Changes in `src/components/records/RecordActionsSheet.tsx` and callers:
- Rename the row from "Edit name" → **"Edit details"** with sub-mode `editFull`.
- When the underlying record is linked to a `transport_attachments` row → open the existing `TicketDetailSheet` in edit mode (airline, flight #, PNR, dep/arr times, passenger, companions, seat class). Save persists to `transport_tickets` (and re-derives the linked attachment label).
- When linked to an appointment/medical record → open the existing appointment/record edit sheet.
- When standalone (no linked entity) → keep today's rename input as a fallback.
- New prop on `RecordActionsSheetProps`: `onEditDetails?: (target) => void` resolved by the caller (Records screen) to the right edit sheet based on `target.kind`.

---

## Technical notes

- All work stays in the existing mobile shell (390px scroll root rules).
- Bilingual EN/AR labels for every new string.
- No changes to `auth.users` or Supabase-reserved schemas; only one new public table (`short_links`) if option 3 short-link toggle is approved.
- Verification: browser walk-through of every button enumerated in §1, plus one round-trip share-as-image on a real flight ticket.

---

## Files touched

- `src/components/TicketDetailSheet.tsx` — fix render, add Share-as-image + short-link toggle, expose edit mode
- `src/components/TransportCard.tsx` — flight duration pill, make "Tap for details" non-interactive child
- `src/components/JourneyTimeline.tsx` — per-leg duration on row + detail
- `src/screens/JourneyScreen.tsx` — wire `onEditDetails` on record actions, verify highlight/scroll
- `src/components/records/RecordActionsSheet.tsx` — Edit details mode, prop, fallbacks
- `src/screens/RecordsScreen.tsx` — resolve `onEditDetails` per record kind
- `src/lib/flightJourney.ts` (+ test) — optional `legDuration` helper
- `supabase/migrations/*` + `supabase/functions/shorten-link/` — only if short-link toggle approved
