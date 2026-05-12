**final holistic implementation prompt**.

`# Final Holistic Fix Prompt — Flight Persistence + AI Vision Extraction`  
  
`Fix these two production-critical issues permanently:`  
  
`1. Signed-in patient flight details disappear after clearing browser cache / site data and hard reload.`  
`2. Flight ticket AI vision parsing is not consistently OpenAI-first, OpenAPI-documented, normalized, or robust for English ticket layouts.`  
  
`This must be a complete code fix, not a plan. Implement, test, and verify end-to-end.`  
  
`---`  
  
`## Core Acceptance Criteria`  
  
`The fix is complete only when:`  
  
`- A signed-in user’s saved flight ticket survives:`  
  `- cache clear`  
  `- localStorage clear`  
  `- hard reload`  
  `- regenerated rufayq_device_id`  
`- Signed-in retrieval works by user_id, not only by device_id.`  
`- Guest current-device tickets are claimed on sign-in through the existing patient claim flow.`  
`- Tickets from another device are **not** rewritten to the current device_id.`  
`- ScannerWizard and AddTripSheet use the same extraction helper.`  
`- OpenAI extract-flight-ticket-ai is primary.`  
`- Gemini scan-itinerary is fallback only.`  
`- Both engines normalize into one app-level contract before save.`  
`- English tickets with City (IATA), AM/PM time, terminal/concourse, codeshare, and multi-leg transit parse correctly.`  
`- OpenAPI includes both flight extraction functions.`  
`- Tests cover transport persistence and flight extraction normalization.`  
`- No broad device-id reassignment is introduced.`  
  
`---`  
  
`## Files To Change / Add`  
  
`Implement the fix across these files:`  
  
`1. src/lib/transportStore.ts`  
`2. src/hooks/useTransportTimeline.ts`  
`3. src/lib/flightExtraction.ts new shared helper`  
`4. src/lib/flightParsing.ts`  
`5. src/components/AddTripSheet.tsx`  
`6. src/screens/ScannerWizard.tsx`  
`7. supabase/functions/extract-flight-ticket-ai/index.ts`  
`8. src/api/openapi.ts`  
`9. supabase/functions/openapi-spec/spec.json`  
`10. src/lib/__tests__/transportStore.test.ts`  
`11. src/lib/__tests__/flightParsing.test.ts`  
`12. src/lib/__tests__/flightExtraction.test.ts`  
`13. src/screens/__tests__/ScannerWizard.e2e.test.tsx`  
`14. src/components/__tests__/AddTripSheet.test.tsx`  
`15. supabase/functions/extract-flight-ticket-ai/index.test.ts`  
  
`---`  
  
`# Part 1 — Durable Flight Persistence`  
  
`## Verified Root Cause`  
`src/hooks/useDeviceId.ts creates a fresh UUID whenever localStorage is empty.`  
  
`The legacy transport path reads tickets only by device_id:`  
  
````ts`  
`.from("transport_tickets")`  
`.select("*")`  
`.eq("device_id", deviceId)`  


So this breaks:

1. User signs in.
2. User saves a flight ticket.
3. Row is saved with user_id = USER and device_id = OLD_DEVICE.
4. User clears site data.
5. App generates NEW_DEVICE.
6. listTickets(NEW_DEVICE) returns nothing.
7. Ticket appears lost forever.

Fix this by making signed-in transport reads user-aware.

---

## **src/lib/transportStore.ts**

Change the store API to use a scope object.

`export type TicketScope = {`  
  `deviceId: string;`  
  `userId?: string | null;`  
`};`  


### **Cache keys**

Replace device-only cache keys with:

`const legacyCacheKey = (deviceId: string) => rufayq.transport.${deviceId};`  
  
`const cacheKey = ({ deviceId, userId }: TicketScope) =>`  
  `userId`  
    `? rufayq.transport.user:${userId}`  
    `: rufayq.transport.device:${deviceId};`  


### **readCache / writeCache**

Update:

`readCache(scopeOrDeviceId: TicketScope | string): TransportTicket[]`  
`writeCache(scopeOrDeviceId: TicketScope | string, tickets: TransportTicket[]): void`  


Rules:

- signed-in cache is keyed by user id
- guest cache is keyed by device id
- support legacy rufayq.transport.${deviceId} as one-time compatibility read
- if signed-in and legacy cache exists, migrate it into the user cache
- never let guest cache mask signed-in DB rows

### **listTickets**

Change:

`listTickets(deviceId: string)`  


to:

`listTickets(scope: TicketScope)`  


Implementation:

`let query = supabase`  
  `.from("transport_tickets")`  
  `.select("*")`  
  `.is("deleted_at", null)`  
  `.order("created_at", { ascending: true });`  
  
`if (userId) {`  
  `query = query.oruser_id.eq.${userId},device_id.eq.${deviceId});`  
`} else {`  
  `query = query.eq("device_id", deviceId);`  
`}`  


Then:

- deduplicate by ticket id
- load transport_flight_segments by union of ticket ids
- map rows back into TransportTicket
- write cache using the same { deviceId, userId } scope

### **saveTicket**

Ensure saved signed-in tickets include:

`user_id = auth.uid()`  
`device_id = currentDeviceId`  


But do **not** update other rows with the same user_id.

Forbidden:

`update transport_tickets`  
`set device_id = current_device`  
`where user_id = auth.uid()`  
  `and device_id <> current_device;`  


That breaks multi-device provenance.

### **deleteTicket**

Change legacy hard delete to soft delete if deleted_at exists:

`.update({ deleted_at: new Date().toISOString() })`  
`.eq("id", ticketId)`  


Then remove from scoped cache.

---

## **src/hooks/useTransportTimeline.ts**

Wire auth state into the transport hook.

Required behavior:

- use supabase.auth.getSession()
- subscribe to supabase.auth.onAuthStateChange
- maintain userId
- maintain authReady
- before auth is resolved, do not perform authoritative refresh
- on user change, clear in-memory tickets to prevent cross-user paint
- call existing claimGuestPatientData() when signed in
- then refresh tickets by { deviceId, userId }

Update calls:

`readCache({ deviceId, userId })`  
`listTickets({ deviceId, userId })`  
`deleteTicket({ deviceId, userId }, ticketId)`  


In addTicket, enrich with:

`const enriched = {`  
  `...ticket,`  
  `deviceId,`  
  `userId,`  
`};`  


Then:

`await saveTicket(enriched);`  
`await refresh();`  


This ensures the saved row is user-owned and reloadable after device id changes.

---

## **RLS Verification**

Confirm migrations already allow:

`transport_tickets.user_id = auth.uid()`  


and segments are readable through parent ticket ownership.

If missing, add migration policies.

Do not rely on x-device-id for signed-in recovery.

---

# **Part 2 — Shared AI Vision Extraction**

## **src/lib/flightExtraction.ts**

Create a new shared helper.

`export async function extractFlightTicket(input: {`  
  `file?: string;`  
  `files?: string[];`  
  `text?: string;`  
`}): Promise<NormalizedFlightExtraction>`  


Behavior:

1. Call Supabase function extract-flight-ticket-ai.
2. If it throws/fails/returns no data, fallback to scan-itinerary.
3. Normalize either response with normalizeFlightExtraction.
4. Return one consistent app contract.

Use:

`supabase.functions.invoke(name, {`  
  `body,`  
  `headers: { "x-device-id": getDeviceId() },`  
`});`  


Define:

`type Provider = "openai" | "gemini";`  


Return provider in the normalized payload.

---

## **normalizeFlightExtraction**

In the same helper or separate module, normalize both engine outputs:

- If outboundSegments exists, use it.
- Else fallback to outboundFlight.
- If returnSegments exists, use it.
- Else fallback to returnFlight.
- Normalize each leg via normalizeParsedLeg.
- Preserve rich fields like:
  - terminals
  - gates
  - fare class
  - baggage allowance
  - raw provider fields

The UI must not care which engine produced the result.

---

# **Part 3 — English Flight Recognition**

## **src/lib/flightParsing.ts**

Enhance deterministic normalization.

Add support for:

### **City IATA pattern**

`"Riyadh (RUH)" -> city "Riyadh", airport "RUH"`  
`"Dubai (DXB)" -> city "Dubai", airport "DXB"`  


Never keep (RUH) inside the city field.

Add regex:

`const CITY_IATA_RE = /^\s*([^()]+?)\s*\(([A-Z]{3})\)\s*$/i;`  


Apply it inside resolveAirport.

### **AM/PM normalization**

Normalize:

`2026-05-10 7:45 PM -> 2026-05-10T19:45`  
`2026-05-10 10:30 AM -> 2026-05-10T10:30`  
`2026-05-10 12:05 AM -> 2026-05-10T00:05`  


Only infer time if date is present in the same datetime string.

---

# **Part 4 — Wire Both UI Surfaces**

## **src/components/AddTripSheet.tsx**

Remove direct scan-itinerary call.

Replace with:

`const parsed = await extractFlightTicket({ files });`  


Then use normalized:

`parsed.outboundSegments`  
`parsed.returnSegments`  
`parsed.outboundFlight`  
`parsed.returnFlight`  


Do not leave AddTripSheet as Gemini-only.

---

## **src/screens/ScannerWizard.tsx**

Remove duplicated extraction logic.

Replace direct OpenAI/Gemini branching with:

`const parsed = await extractFlightTicket({ files });`  
`console.info("[scanner] flight extraction provider:", parsed.provider);`  


Keep the existing OCR/manual fallback UX.

---

# **Part 5 — Edge Function Prompt Improvements**

## **supabase/functions/extract-flight-ticket-ai/index.ts**

Keep the strict JSON schema.

Do not loosen output validation.

Add English-specific rules to the prompt/input context:

`English ticket rules:`  
`- If a location appears as "City (IATA)", split it into city and airport code.`  
`- Never include parenthesized IATA in fromCity/toCity.`  
`- Convert AM/PM times to 24-hour ISO timestamps when the date is visible in the same row, column, or segment.`  
`- If a time is visible without reliable date context, return null rather than inventing a date.`  
`- For codeshare / "operated by" blocks, prefer the operating carrier flight number when explicitly shown.`  
`- Preserve terminal, gate, and concourse labels exactly as printed, including "Terminal 1", "T1", and "Concourse A".`  
`- Treat "Stop in <city>", "Layover", "Transit", and "Connection" rows as segment boundaries when flight numbers or airport codes indicate multiple legs.`  
`- Do not collapse multi-leg itineraries into a direct route.`  


If text is more than 80% ASCII, add an English hint inside the input text.

Do not add unsupported OpenAI API params such as fake language fields.

Do not add temperature unless the current Responses model supports it.

---

# **Part 6 — OpenAPI**

## **src/api/openapi.ts**

Add schemas:

- FlightExtractionLeg
- FlightExtraction

Add paths:

`POST /functions/v1/extract-flight-ticket-ai`  
`POST /functions/v1/scan-itinerary`  


Both must document:

`{`  
  `file?: string;   // image data URL`  
  `files?: string[]; // image data URLs`  
  `text?: string;`  
`}`  


Both require:

`x-device-id`  


Do not document raw binary upload unless actually implemented.

## **supabase/functions/openapi-spec/spec.json**

Regenerate with:

`node scripts/export-openapi.mjs`  


If generation is unavailable, manually keep it in sync and validate JSON.

---

# **Part 7 — Tests**

## **src/lib/__tests__/transportStore.test.ts**

Add tests for:

1. signed-in read after device id changes:
  - row has device_id = old-device
  - row has user_id = user-1
  - call listTickets({ deviceId: "new-device", userId: "user-1" })
  - expect ticket returned
2. guest-only read:
  - no userId
  - query only by device_id
3. cache isolation:
  - guest cache and user cache are separate
  - signed-in cache is not masked by guest cache
4. no broad device rewrite:
  - confirm no function updates all user rows to current device id

## **src/lib/__tests__/flightParsing.test.ts**

Add tests for:

- Riyadh (RUH) split
- Dubai (DXB) split
- AM/PM conversion
- 12 AM / 12 PM edge cases
- unknown airport fallback

## **src/lib/__tests__/flightExtraction.test.ts**

Mock supabase.functions.invoke.

Test:

1. OpenAI success:
  - calls extract-flight-ticket-ai
  - does not call scan-itinerary
  - returns normalized legs
2. OpenAI failure:
  - falls back to scan-itinerary
  - returns provider gemini
3. no provider data:
  - throws meaningful extraction error

## **src/screens/__tests__/ScannerWizard.e2e.test.tsx**

Update existing scanner tests so mocked invoke expects:

1. first call to extract-flight-ticket-ai
2. fallback call to scan-itinerary only when primary fails

Add English fixture with:

`fromAirport: "Riyadh (RUH)"`  
`toAirport: "Dubai (DXB)"`  
`departureDateTime: "2026-05-10 7:45 PM"`  


Verify rendered result uses:

`RUH`  
`DXB`  
`19:45`  


## **src/components/__tests__/AddTripSheet.test.tsx**

Add test proving AddTripSheet uses the shared extraction path and no longer calls scan-itinerary directly unless OpenAI fails.

## **supabase/functions/extract-flight-ticket-ai/index.test.ts**

Add edge function tests or mocked response tests for:

- Saudia multi-leg
- flynas one-way
- Emirates/codeshare multi-leg

Do not make normal CI depend on live paid AI calls unless repo has explicit gated integration-test convention.

---

# **Part 8 — Verification Commands**

Run:

`npm test`  
`npm run build`  
`npm run lint`  
`node scripts/export-openapi.mjs`  


If available:

`npm run test:e2e`  
`supabase test edge functions extract-flight-ticket-ai`  


Manual smoke:

1. Sign in.
2. Scan/save an English flight ticket.
3. Confirm it appears in Journey transport timeline.
4. Clear site data/localStorage.
5. Hard reload.
6. Confirm ticket reappears from Supabase by user_id.
7. Confirm guest-only unsynced ticket disappears after site data clear; document this as expected unless user signs in first.
8. Confirm AddTripSheet and ScannerWizard both use OpenAI primary, Gemini fallback.

---

# **Important Forbidden Fixes**

Do not implement:

`update transport_tickets`  
`set device_id = current_device`  
`where user_id = auth.uid()`  
  `and device_id <> current_device;`  


Do not make device id authoritative for signed-in users.

Do not keep AddTripSheet on Gemini-only extraction.

Do not add unsupported OpenAI parameters.

Do not loosen the strict JSON schema.

Do not introduce new hard deletes for transport tickets.

---

# **Summary of Expected Change Size**

This should be a multi-file production fix touching roughly these areas:

- transport persistence
- auth-aware ticket retrieval
- scoped cache
- guest claim integration
- shared AI extraction helper
- English parsing normalization
- ScannerWizard wiring
- AddTripSheet wiring
- OpenAI prompt rules
- OpenAPI source
- OpenAPI generated spec
- unit tests
- scanner tests
- edge function tests

Expect a substantial patch, roughly 15 files and several hundred lines of changes. Do not reduce this to a superficial prompt-only or UI-only fix.