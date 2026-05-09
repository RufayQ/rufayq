## Goal

Extend `src/lib/__tests__/pdfScoring.test.ts` with additional fixtures and assertions so the multi-page best-page scoring stays accurate for stopovers, multi-city itineraries, and a wider set of airlines. No production code changes — tests only.

## Scope

- File touched: `src/lib/__tests__/pdfScoring.test.ts` (extend, do not rewrite existing fixtures/tests).
- No changes to `src/lib/pdfToImages.ts`. If a new fixture exposes a real scoring weakness, we'll note it as a follow-up rather than silently retune the heuristic in this slice.

## New fixtures (paraphrased, no PII)

1. **Stopover / connecting flights**
  - `QATAR_STOPOVER_PAGE` — single page with two legs: `JED → DOH` (QR 1163) and `DOH → LHR` (QR 5), shared PNR, layover time noted.
  - `LUFTHANSA_CONNECTION_PAGE` — `RUH → FRA` (LH 631) + `FRA → MUC` (LH 100), connection time, shared booking ref.
2. **Multi-city itinerary (3+ legs across pages)**
  - `MULTICITY_LEG1_PAGE` — `JED → CAI` EgyptAir MS 666.
  - `MULTICITY_LEG2_PAGE` — `CAI → IST` Turkish TK 691.
  - `MULTICITY_LEG3_PAGE` — `IST → JED` Turkish TK 144.
  - Used together with cover, T&Cs, and an ad page in a 7-page document.
3. **Additional airlines** (text-layer fixtures with full leg detail)
  - `ETIHAD_FLIGHT_PAGE` — EY 240 `AUH → LHR`.
  - `QATAR_FLIGHT_PAGE` — QR 1163 `JED → DOH` (single leg, distinct from stopover).
  - `EGYPTAIR_FLIGHT_PAGE` — MS 666 `JED → CAI`.
  - `LUFTHANSA_FLIGHT_PAGE` — LH 631 `RUH → FRA`.
  - `AIR_ARABIA_FLIGHT_PAGE` — G9 514 `SHJ → COK`.
  - `PEGASUS_FLIGHT_PAGE` — PC 742 `SAW → JED`.
4. **Additional non-itinerary distractors** to keep negatives realistic
  - `EMIRATES_FARE_RULES_PAGE` — fare rules / change & refund policy.
  - `KLM_CHECKIN_INSTRUCTIONS_PAGE` — online check-in steps + airport map blurb (mentions "boarding" but no leg).

## New test cases

Added under the existing `describe` blocks (no restructuring):

- `scoreFlightText`
  - Each new airline flight page outscores `EMIRATES_LOUNGE_PAGE`, `FLYNAS_AD`, `SAUDIA_TERMS`, `SAUDIA_BAGGAGE`, `EMIRATES_FARE_RULES_PAGE`, and `KLM_CHECKIN_INSTRUCTIONS_PAGE`.
  - Stopover pages (`QATAR_STOPOVER_PAGE`, `LUFTHANSA_CONNECTION_PAGE`) score ≥ a corresponding single-leg page (since they contain more flight signals).
  - Fare-rules and check-in instruction pages score below every real leg page.
- `recommendPages — text-based selection`
  - **Stopover, single page**: 4-page Qatar ticket `[cover, QATAR_STOPOVER_PAGE, terms, ad]` → `recommendPages(pages, 1) === [2]`. Even with `topN=2`, the stopover page must be #1 in document order.
  - **Connection across one page**: `[cover, LUFTHANSA_CONNECTION_PAGE, baggage, terms]` → `[2]`.
  - **Multi-city, 3 legs across pages**: `[cover, MULTICITY_LEG1_PAGE, ad, MULTICITY_LEG2_PAGE, terms, MULTICITY_LEG3_PAGE, baggage]` → `recommendPages(pages, 3) === [2, 4, 6]` (document order preserved).
  - **Multi-city with `topN=2**`: same input, expect 2 of `{2,4,6}` in document order, all from leg pages — assert `picked.every(i => [2,4,6].includes(i)) && picked.length === 2 && picked[0] < picked[1]`.
  - **Mixed-airline 5-page itinerary**: `[ETIHAD_FLIGHT_PAGE, EMIRATES_FARE_RULES_PAGE, QATAR_FLIGHT_PAGE, KLM_CHECKIN_INSTRUCTIONS_PAGE, FLYNAS_AD]` → `recommendPages(pages, 2) === [1, 3]`.
  - **Single leg surrounded by distractors per airline**: parameterised loop over the 6 new airline pages, each embedded as `[cover, AIRLINE_PAGE, terms, ad]`, expecting `[2]`.

## Out of scope

- No new image-based fixtures — existing `scoreFlightImage` coverage already exercises that path; multi-city scanned PDFs would need real raster fixtures and add little signal.
- No tuning of `scoreFlightText` weights. If any new assertion fails, the failure itself is the deliverable signal and we'll address it in a follow-up slice.

## Verification

- Run `bunx vitest run src/lib/__tests__/pdfScoring.test.ts` after the edit; expect all existing + new tests green.
- If a new assertion fails, report the offending fixture and proposed heuristic adjustment instead of weakening the assertion.  
Areas That Need Improvement
  **1. Stopover scoring assertion is under-specified**
  The rule "stopover pages score ≥ a corresponding single-leg page" is ambiguous. Which single-leg page is the baseline? If it's compared to `QATAR_FLIGHT_PAGE` (same airline), that's meaningful. If it's compared to `ETIHAD_FLIGHT_PAGE` (different airline), the comparison is noise. Be explicit:
  ```
  // QATAR_STOPOVER_PAGE (2 legs) must outscore QATAR_FLIGHT_PAGE (1 leg, same airline)
  expect(score(QATAR_STOPOVER_PAGE)).toBeGreaterThanOrEqual(score(QATAR_FLIGHT_PAGE));
  ```
  **2. Multi-city topN=2 assertion is too loose**
  The assertion `picked.every(i => [2,4,6].includes(i)) && picked.length === 2 && picked[0] < picked[1]` only verifies that 2 leg pages were picked in order, but it doesn't assert *which* 2. If the algorithm always drops the 3rd leg, this test will silently pass even if leg selection is biased. Consider adding a comment noting this is intentionally relaxed, or tighten to assert a minimum score gap between picked and non-picked pages.
  **3. Missing edge case: single-leg document (1-page PDF)**
  A document with only one page should always return `[1]` regardless of content quality. This guards against off-by-one or empty-array bugs in `recommendPages`. Very quick to add.
  **4. Missing edge case: topN greater than available pages**
  What happens when `topN=5` is passed to a 3-page document? The contract should be explicit (return all pages? clamp silently? throw?). Even a single test documenting the expected behaviour prevents future regressions.
  **5. No fixture for a page with flight numbers but NO actual itinerary**
  Something like a flight status notification ("Your flight QR 1163 is delayed") or a frequent flyer statement that mentions flights — these contain strong flight signals but are not boarding pass/itinerary pages. The current negatives (fare rules, check-in instructions) are too obviously non-flight. Adding one "false positive trap" fixture would make the negative coverage much more robust.
  **6.** `LUFTHANSA_CONNECTION_PAGE` **vs** `LUFTHANSA_FLIGHT_PAGE` **naming could create confusion**
  Both contain LH 631 RUH → FRA. If a future developer adds a test mixing them, it's easy to accidentally use the connection page where the single-leg page was intended. Consider naming it `LUFTHANSA_SINGLE_LEG_PAGE` or adding an inline comment clarifying the distinction.
  **7. Verification step should mention** `--reporter=verbose`
  bash
  ```bash
  bunx vitest run src/lib/__tests__/pdfScoring.test.ts --reporter=verbose
  ```
  Without verbose output, a test failure in a parameterised loop only tells you the loop failed, not which airline fixture broke it.
  ---
  ### Minor Suggestions
  - The 7-page multi-city document layout `[cover, leg1, ad, leg2, terms, leg3, baggage]` is a good realistic shuffle, but consider also testing `[leg1, leg2, leg3, cover, terms, ad, baggage]` (legs first) to confirm document-order output is index-based, not insertion-order based.
  - Add a brief comment on `EGYPTAIR_FLIGHT_PAGE` noting that MS 666 appears in both the single-airline fixture AND the multi-city fixtures — intentional overlap, but easy to question during review.  
  After OCR succeeds and recommendPages selects the best pages, wire the parsed 
    flight data into the Journey Map with the following logic:
    SINGLE LEG: Creates one journey entry in the Transport Timeline.
    ROUND TRIP: If two legs are detected with reversed origin/destination 
    (e.g. RUH→LHR and LHR→RUH), create two separate journey entries:
    - Leg 1 → placed in the "Going" segment of the journey
    - Leg 2 → placed in the "Return" segment of the journey
    Display both in the Scanner result under separate "Outbound" / "Return" 
    tabs before saving.
    STOPOVER (connecting flight): If two legs share a PNR and the destination 
    of leg 1 matches the origin of leg 2, treat them as one journey with 
    intermediate stops. Create one journey entry with a stops array.
    MULTI-CITY (3+ legs, different PNRs or non-connecting): Create one journey 
    entry per leg, all linked under the same trip/document ID.
    All parsed journeys must flow through the same save pipeline as a 
    standard single-leg OCR result.