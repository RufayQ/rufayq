/**
 * Multi-page airline ticket scoring tests.
 *
 * We can't ship real airline PDFs in the repo (PII + carrier IP), so the
 * fixtures here are paraphrased text-layer extracts captured from real
 * Saudia / flynas / Emirates / Turkish Airlines tickets and the
 * marketing/legal pages that appear alongside them.
 *
 * The contract under test: when a multi-page itinerary is split into its
 * pages, `recommendPages` must select the actual flight-leg page(s) and
 * NOT the T&C / baggage / fare-rules / advertising pages.
 *
 * `scoreFlightImage` is also exercised with hand-built ImageData so we
 * cover the scanned-PDF code path without a real canvas.
 */
import { describe, it, expect } from "vitest";
import {
  scoreFlightText,
  scoreFlightImage,
  recommendPages,
  type PdfPageInfo,
} from "../pdfToImages";

// ─── Fixtures: realistic page-text approximations ─────────────────────

const SAUDIA_COVER = `Saudia
e-Ticket
Booking confirmation
Thank you for choosing Saudia. Please find your itinerary attached.
Manage your booking online at saudia.com`;

const SAUDIA_FLIGHT_PAGE = `PASSENGER: AL-RASHIDI / MOHAMMED MR
TICKET NO: 065 2195976682
PNR: AB1234

FLIGHT SV 301   SAUDIA
FROM RUH Riyadh — King Khalid International
TO   BER Berlin — Brandenburg
DEPARTURE 05 APR 2026  08:30
ARRIVAL   05 APR 2026  13:45
SEAT 14C  CLASS J BUSINESS
GATE B12  TERMINAL 1
BAGGAGE ALLOWANCE 2PC 32KG`;

const SAUDIA_RETURN_PAGE = `PASSENGER: AL-RASHIDI / MOHAMMED MR
PNR: AB1234

FLIGHT SV 132   SAUDIA
FROM BER Berlin — Brandenburg
TO   RUH Riyadh — King Khalid International
DEPARTURE 18 APR 2026  15:20
ARRIVAL   18 APR 2026  23:55
SEAT 9A   CLASS J BUSINESS
GATE A4   TERMINAL 1`;

const SAUDIA_BAGGAGE = `BAGGAGE ALLOWANCE CHART
Economy Guest        1 piece × 23 kg
Flex                 2 pieces × 23 kg
Business             2 pieces × 32 kg
First                3 pieces × 32 kg
Carry-on             7 kg
Prohibited items: lithium batteries above 100 Wh, sharp objects,
flammable liquids, aerosol cans...`;

const SAUDIA_TERMS = `Conditions of Carriage
1. The contract of carriage between the passenger and the carrier is
   governed by the Montreal Convention 1999 and the General Conditions
   of Carriage of the issuing carrier.
2. Refunds, changes and rebooking are subject to the fare rules
   associated with your ticket.
3. Privacy policy: we process personal data in accordance with...
4. Terms and conditions apply to all bookings made via saudia.com.`;

const FLYNAS_AD = `Travel further with flynas
Discover our new destinations across Europe and Asia.
Book now at flynas.com and enjoy up to 30% off on selected routes.
Download our app for the smoothest booking experience.`;

const TURKISH_FLIGHT_PAGE = `PASSENGER MR ALI HASSAN
PNR: TK9PQR
TICKET NO 235 4129870032

TK 1735  TURKISH AIRLINES
JED Jeddah → IST Istanbul
DEP 12 SEP 2026  14:05
ARR 12 SEP 2026  18:10
ECONOMY  SEAT 22F`;

const EMIRATES_LOUNGE_PAGE = `Emirates Skywards
Earn miles on every Emirates flight you take.
Lounge access in over 40 cities worldwide.
Upgrade to Business or First using your miles.
Sign up at emirates.com/skywards.`;

// ─── Text-based scoring ───────────────────────────────────────────────

describe("scoreFlightText", () => {
  it("scores real flight-leg pages higher than marketing/legal pages", () => {
    expect(scoreFlightText(SAUDIA_FLIGHT_PAGE)).toBeGreaterThan(scoreFlightText(SAUDIA_COVER));
    expect(scoreFlightText(SAUDIA_FLIGHT_PAGE)).toBeGreaterThan(scoreFlightText(FLYNAS_AD));
    expect(scoreFlightText(SAUDIA_FLIGHT_PAGE)).toBeGreaterThan(scoreFlightText(EMIRATES_LOUNGE_PAGE));
    expect(scoreFlightText(TURKISH_FLIGHT_PAGE)).toBeGreaterThan(scoreFlightText(EMIRATES_LOUNGE_PAGE));
  });

  it("penalises Conditions of Carriage / privacy pages", () => {
    expect(scoreFlightText(SAUDIA_TERMS)).toBeLessThan(scoreFlightText(SAUDIA_FLIGHT_PAGE));
    // T&C pages mention airline keywords but shouldn't beat a real leg
    expect(scoreFlightText(SAUDIA_TERMS)).toBeLessThan(scoreFlightText(SAUDIA_RETURN_PAGE));
  });

  it("penalises baggage charts so they don't outrank itinerary pages", () => {
    expect(scoreFlightText(SAUDIA_BAGGAGE)).toBeLessThan(scoreFlightText(SAUDIA_FLIGHT_PAGE));
  });

  it("returns 0 for empty input", () => {
    expect(scoreFlightText("")).toBe(0);
    expect(scoreFlightText("   \n\n  ")).toBe(0);
  });
});

// ─── Multi-page recommendation: end-to-end behavioural tests ──────────

function makeTextPages(texts: string[], overrides: Partial<PdfPageInfo> = {}): PdfPageInfo[] {
  return texts.map((t, i) => ({
    pageIndex: i + 1,
    textScore: scoreFlightText(t),
    imageScore: 0,
    score: scoreFlightText(t),
    hasText: t.trim().length > 20,
    thumbDataUrl: "",
    aspect: 1,
    ...overrides,
  }));
}

describe("recommendPages — text-based selection", () => {
  it("picks the single flight-leg page out of a 5-page Saudia one-way ticket", () => {
    const pages = makeTextPages([
      SAUDIA_COVER,
      SAUDIA_FLIGHT_PAGE,
      SAUDIA_BAGGAGE,
      SAUDIA_TERMS,
      FLYNAS_AD,
    ]);
    expect(recommendPages(pages, 1)).toEqual([2]);
  });

  it("picks both legs of a 6-page Saudia round trip in document order", () => {
    const pages = makeTextPages([
      SAUDIA_COVER,
      SAUDIA_FLIGHT_PAGE,    // outbound
      SAUDIA_BAGGAGE,
      SAUDIA_RETURN_PAGE,    // return
      SAUDIA_TERMS,
      FLYNAS_AD,
    ]);
    const picked = recommendPages(pages, 2);
    expect(picked).toEqual([2, 4]);
  });

  it("picks the flight page over a lounge ad in a 3-page Emirates ticket", () => {
    const pages = makeTextPages([
      EMIRATES_LOUNGE_PAGE,
      TURKISH_FLIGHT_PAGE,
      EMIRATES_LOUNGE_PAGE,
    ]);
    expect(recommendPages(pages, 1)).toEqual([2]);
  });

  it("falls back to first N pages when nothing scores", () => {
    const pages = makeTextPages([
      "Header only",
      "Footer only",
      "More boilerplate",
    ]);
    expect(recommendPages(pages, 2)).toEqual([1, 2]);
  });

  it("returns at least one page when topN > pages.length", () => {
    const pages = makeTextPages([SAUDIA_FLIGHT_PAGE]);
    expect(recommendPages(pages, 5)).toEqual([1]);
  });

  it("handles empty input", () => {
    expect(recommendPages([], 2)).toEqual([]);
  });
});

// ─── Image-based fallback (scanned PDFs) ──────────────────────────────

function makeImageData(width: number, height: number, fill: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const v = fill(x, y);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe("scoreFlightImage — scanned-PDF fallback", () => {
  it("returns ~0 for a totally blank page", () => {
    const blank = makeImageData(60, 80, () => 255);
    expect(scoreFlightImage(blank)).toBeLessThanOrEqual(1);
  });

  it("returns a low score for a uniform dark/photo page", () => {
    const photo = makeImageData(60, 80, () => 60); // uniformly dark
    expect(scoreFlightImage(photo)).toBeLessThan(3);
  });

  it("scores text-like striped pages higher than blank or photo pages", () => {
    // Simulate text rows: every 4th row is dark (text), others are light
    const textLike = makeImageData(60, 80, (_x, y) => (y % 4 === 0 ? 50 : 250));
    const blank = makeImageData(60, 80, () => 255);
    const photo = makeImageData(60, 80, () => 80);
    const sText = scoreFlightImage(textLike);
    expect(sText).toBeGreaterThan(scoreFlightImage(blank));
    expect(sText).toBeGreaterThan(scoreFlightImage(photo));
  });

  it("ranks a moderately-dense text page above a very sparse one", () => {
    // Sparse drops below saturation; dense uses normal text spacing.
    const dense = makeImageData(60, 120, (_x, y) => (y % 4 === 0 ? 40 : 245));
    const sparse = makeImageData(60, 120, (_x, y) => (y < 8 && (y % 2 === 0) ? 40 : 252));
    expect(scoreFlightImage(dense)).toBeGreaterThan(scoreFlightImage(sparse));
  });

  it("recommendPages picks the text-like page in a scanned 3-page PDF", () => {
    // Build PdfPageInfo objects directly with image scores only (hasText=false)
    const blank = makeImageData(60, 80, () => 255);
    const photo = makeImageData(60, 80, () => 70);
    const textLike = makeImageData(60, 80, (_x, y) => (y % 4 === 0 ? 50 : 250));
    const pages: PdfPageInfo[] = [blank, textLike, photo].map((img, i) => {
      const imgScore = scoreFlightImage(img);
      return {
        pageIndex: i + 1,
        textScore: 0,
        imageScore: imgScore,
        score: imgScore,
        hasText: false,
        thumbDataUrl: "",
        aspect: 0.75,
      };
    });
    expect(recommendPages(pages, 1)).toEqual([2]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Extended fixtures: stopovers, multi-city, more airlines, false positives
// ─────────────────────────────────────────────────────────────────────

// Stopover / connecting (two legs share a PNR, dest of leg1 == origin of leg2)
const QATAR_STOPOVER_PAGE = `PASSENGER: ALOTAIBI / SARA MS
PNR: QR7XY2
TICKET NO 157 9821330041

FLIGHT QR 1163  QATAR AIRWAYS
FROM JED Jeddah — King Abdulaziz International
TO   DOH Doha — Hamad International
DEPARTURE 12 JUN 2026  02:15
ARRIVAL   12 JUN 2026  04:50
SEAT 18B  CLASS Y ECONOMY

LAYOVER DOH 02h 25m

FLIGHT QR 5     QATAR AIRWAYS
FROM DOH Doha — Hamad International
TO   LHR London — Heathrow
DEPARTURE 12 JUN 2026  07:15
ARRIVAL   12 JUN 2026  12:35
SEAT 22A  CLASS Y ECONOMY
BAGGAGE ALLOWANCE 2PC 23KG`;

// Single-leg Lufthansa (named clearly so it can't be confused with the connection page).
const LUFTHANSA_SINGLE_LEG_PAGE = `PASSENGER MR THOMAS WEBER
PNR: LH4ABC
TICKET NO 220 9911223344

LH 631  LUFTHANSA
RUH Riyadh → FRA Frankfurt
DEP 03 OCT 2026  01:55
ARR 03 OCT 2026  06:40
ECONOMY  SEAT 31C`;

// Connecting flights via Frankfurt (intentionally reuses LH 631 to mirror real itineraries)
const LUFTHANSA_CONNECTION_PAGE = `PASSENGER MR THOMAS WEBER
BOOKING REF: LH4ABC

LH 631  LUFTHANSA
RUH Riyadh → FRA Frankfurt
DEP 03 OCT 2026  01:55
ARR 03 OCT 2026  06:40
SEAT 31C  ECONOMY

CONNECTION TIME 01h 30m

LH 100  LUFTHANSA
FRA Frankfurt → MUC Munich
DEP 03 OCT 2026  08:10
ARR 03 OCT 2026  09:05
SEAT 12A  ECONOMY`;

// Multi-city legs (three separate pages, three different carriers)
const MULTICITY_LEG1_PAGE = `PASSENGER NOURA / KHALED MR
PNR: MC9ZZ1
MS 666  EGYPTAIR
JED Jeddah → CAI Cairo
DEP 14 NOV 2026  08:20
ARR 14 NOV 2026  10:05
SEAT 14F  ECONOMY  TERMINAL 2`;

const MULTICITY_LEG2_PAGE = `PASSENGER NOURA / KHALED MR
PNR: MC9ZZ2
TK 691  TURKISH AIRLINES
CAI Cairo → IST Istanbul
DEP 18 NOV 2026  13:50
ARR 18 NOV 2026  17:20
SEAT 9D  ECONOMY  GATE F12`;

const MULTICITY_LEG3_PAGE = `PASSENGER NOURA / KHALED MR
PNR: MC9ZZ3
TK 144  TURKISH AIRLINES
IST Istanbul → JED Jeddah
DEP 22 NOV 2026  19:05
ARR 22 NOV 2026  23:40
SEAT 27A  ECONOMY  GATE B7`;

// Single-leg fixtures for the wider airline matrix
const ETIHAD_FLIGHT_PAGE = `PASSENGER MR HAMAD AL MAZROUI
PNR: EY3KLM
TICKET NO 607 4480091122

EY 240  ETIHAD AIRWAYS
AUH Abu Dhabi → LHR London Heathrow
DEP 21 MAY 2026  09:30
ARR 21 MAY 2026  13:55
BUSINESS  SEAT 6K  GATE 32`;

const QATAR_FLIGHT_PAGE = `PASSENGER MS LAYLA AHMED
PNR: QR9PLM
TICKET NO 157 8830014477

QR 1163  QATAR AIRWAYS
JED Jeddah → DOH Doha
DEP 02 AUG 2026  03:10
ARR 02 AUG 2026  05:40
ECONOMY  SEAT 19F  TERMINAL 1`;

// NOTE: MS 666 also appears in MULTICITY_LEG1_PAGE — intentional: real
// passengers often reuse the same flight number across documents. The
// fixtures differ in PNR + surrounding context.
const EGYPTAIR_FLIGHT_PAGE = `PASSENGER MR YOUSSEF KAMAL
PNR: MS5QRS
MS 666  EGYPTAIR
JED Jeddah → CAI Cairo
DEP 09 JAN 2026  08:20
ARR 09 JAN 2026  10:05
ECONOMY  SEAT 22B  GATE D4`;

const AIR_ARABIA_FLIGHT_PAGE = `PASSENGER MR RAVI MENON
PNR: G9TUV1
G9 514  AIR ARABIA
SHJ Sharjah → COK Kochi
DEP 17 FEB 2026  04:25
ARR 17 FEB 2026  09:55
ECONOMY  SEAT 18C`;

const PEGASUS_FLIGHT_PAGE = `PASSENGER MR EMRE YILDIZ
PNR: PCWXY2
PC 742  PEGASUS
SAW Istanbul Sabiha Gokcen → JED Jeddah
DEP 28 MAR 2026  23:40
ARR 29 MAR 2026  03:50
ECONOMY  SEAT 11A`;

// Distractors that mention airlines / "boarding" but are NOT itinerary pages
const EMIRATES_FARE_RULES_PAGE = `Fare Rules — Emirates
Change fee: USD 200 prior to departure, USD 350 after.
Refund: non-refundable in case of no-show.
Rebooking permitted within ticket validity subject to fare difference.
For full conditions please consult emirates.com/farerules.`;

const KLM_CHECKIN_INSTRUCTIONS_PAGE = `Online check-in is available 30 hours before boarding.
Visit klm.com/checkin or use the KLM mobile app.
Please arrive at the airport at least 2 hours before departure for international flights.
Airport map and lounge information are available on our website.`;

// False-positive trap: mentions a real flight number but is just a status alert.
const FLIGHT_STATUS_ALERT_PAGE = `Flight Status Notification
Your flight QR 1163 has been delayed by 35 minutes.
For real-time updates, please refer to qatarairways.com/flightstatus
or download the Qatar Airways mobile app.
We apologise for any inconvenience caused.`;

// ─── Extended scoreFlightText assertions ──────────────────────────────

describe("scoreFlightText — extended airline + distractor coverage", () => {
  const realLegPages: Array<[string, string]> = [
    ["Etihad",     ETIHAD_FLIGHT_PAGE],
    ["Qatar",      QATAR_FLIGHT_PAGE],
    ["EgyptAir",   EGYPTAIR_FLIGHT_PAGE],
    ["Lufthansa",  LUFTHANSA_SINGLE_LEG_PAGE],
    ["Air Arabia", AIR_ARABIA_FLIGHT_PAGE],
    ["Pegasus",    PEGASUS_FLIGHT_PAGE],
  ];

  const distractors: Array<[string, string]> = [
    ["Lounge ad",          EMIRATES_LOUNGE_PAGE],
    ["flynas ad",          FLYNAS_AD],
    ["Saudia T&Cs",        SAUDIA_TERMS],
    ["Saudia baggage",     SAUDIA_BAGGAGE],
    ["Emirates fare rules", EMIRATES_FARE_RULES_PAGE],
    ["KLM check-in",       KLM_CHECKIN_INSTRUCTIONS_PAGE],
    ["Flight status alert", FLIGHT_STATUS_ALERT_PAGE],
  ];

  for (const [airline, leg] of realLegPages) {
    for (const [name, distractor] of distractors) {
      it(`${airline} leg outscores ${name}`, () => {
        expect(scoreFlightText(leg)).toBeGreaterThan(scoreFlightText(distractor));
      });
    }
  }

  it("Qatar stopover (2 legs) scores >= Qatar single leg (same airline)", () => {
    expect(scoreFlightText(QATAR_STOPOVER_PAGE))
      .toBeGreaterThanOrEqual(scoreFlightText(QATAR_FLIGHT_PAGE));
  });

  it("Lufthansa connection (2 legs) scores >= Lufthansa single leg", () => {
    expect(scoreFlightText(LUFTHANSA_CONNECTION_PAGE))
      .toBeGreaterThanOrEqual(scoreFlightText(LUFTHANSA_SINGLE_LEG_PAGE));
  });
});

// ─── Extended recommendPages assertions ───────────────────────────────

describe("recommendPages — stopovers, multi-city, mixed airlines", () => {
  it("picks the stopover page out of a 4-page Qatar ticket", () => {
    const pages = makeTextPages([
      SAUDIA_COVER,
      QATAR_STOPOVER_PAGE,
      SAUDIA_TERMS,
      FLYNAS_AD,
    ]);
    expect(recommendPages(pages, 1)).toEqual([2]);
    // With topN=2 the stopover page must still be present and first in doc order
    const top2 = recommendPages(pages, 2);
    expect(top2[0]).toBe(2);
  });

  it("picks the connection page out of a 4-page Lufthansa ticket", () => {
    const pages = makeTextPages([
      SAUDIA_COVER,
      LUFTHANSA_CONNECTION_PAGE,
      SAUDIA_BAGGAGE,
      SAUDIA_TERMS,
    ]);
    expect(recommendPages(pages, 1)).toEqual([2]);
  });

  it("picks all three legs of a 7-page multi-city itinerary in document order", () => {
    const pages = makeTextPages([
      SAUDIA_COVER,
      MULTICITY_LEG1_PAGE,
      FLYNAS_AD,
      MULTICITY_LEG2_PAGE,
      SAUDIA_TERMS,
      MULTICITY_LEG3_PAGE,
      SAUDIA_BAGGAGE,
    ]);
    expect(recommendPages(pages, 3)).toEqual([2, 4, 6]);
  });

  it("multi-city with topN=2 returns 2 leg pages in document order (relaxed)", () => {
    // Intentionally relaxed: we don't assert WHICH 2 of the 3 legs win,
    // only that both picks are real legs and remain in document order.
    const pages = makeTextPages([
      SAUDIA_COVER,
      MULTICITY_LEG1_PAGE,
      FLYNAS_AD,
      MULTICITY_LEG2_PAGE,
      SAUDIA_TERMS,
      MULTICITY_LEG3_PAGE,
      SAUDIA_BAGGAGE,
    ]);
    const picked = recommendPages(pages, 2);
    const legPages = [2, 4, 6];
    expect(picked).toHaveLength(2);
    expect(picked.every((i) => legPages.includes(i))).toBe(true);
    expect(picked[0]).toBeLessThan(picked[1]);
  });

  it("legs-first ordering still returns picks in document order, not score order", () => {
    const pages = makeTextPages([
      MULTICITY_LEG1_PAGE,
      MULTICITY_LEG2_PAGE,
      MULTICITY_LEG3_PAGE,
      SAUDIA_COVER,
      SAUDIA_TERMS,
      FLYNAS_AD,
      SAUDIA_BAGGAGE,
    ]);
    expect(recommendPages(pages, 3)).toEqual([1, 2, 3]);
  });

  it("mixed-airline 5-page itinerary picks the two real legs", () => {
    const pages = makeTextPages([
      ETIHAD_FLIGHT_PAGE,
      EMIRATES_FARE_RULES_PAGE,
      QATAR_FLIGHT_PAGE,
      KLM_CHECKIN_INSTRUCTIONS_PAGE,
      FLYNAS_AD,
    ]);
    expect(recommendPages(pages, 2)).toEqual([1, 3]);
  });

  it("single-leg surrounded by distractors picks the leg for each airline", () => {
    const cases: Array<[string, string]> = [
      ["Etihad",     ETIHAD_FLIGHT_PAGE],
      ["Qatar",      QATAR_FLIGHT_PAGE],
      ["EgyptAir",   EGYPTAIR_FLIGHT_PAGE],
      ["Lufthansa",  LUFTHANSA_SINGLE_LEG_PAGE],
      ["Air Arabia", AIR_ARABIA_FLIGHT_PAGE],
      ["Pegasus",    PEGASUS_FLIGHT_PAGE],
    ];
    for (const [airline, leg] of cases) {
      const pages = makeTextPages([SAUDIA_COVER, leg, SAUDIA_TERMS, FLYNAS_AD]);
      expect(recommendPages(pages, 1), `airline: ${airline}`).toEqual([2]);
    }
  });

  it("flight status alert does not get picked over a real itinerary page", () => {
    const pages = makeTextPages([
      FLIGHT_STATUS_ALERT_PAGE,
      SAUDIA_FLIGHT_PAGE,
      FLIGHT_STATUS_ALERT_PAGE,
    ]);
    expect(recommendPages(pages, 1)).toEqual([2]);
  });

  it("single-page document always returns [1]", () => {
    const pages = makeTextPages([SAUDIA_COVER]);
    expect(recommendPages(pages, 1)).toEqual([1]);
    expect(recommendPages(pages, 3)).toEqual([1]);
  });

  it("topN greater than available pages clamps to the available set", () => {
    const pages = makeTextPages([SAUDIA_COVER, SAUDIA_FLIGHT_PAGE, SAUDIA_TERMS]);
    const picked = recommendPages(pages, 10);
    expect(picked.length).toBeLessThanOrEqual(3);
    expect(picked.length).toBeGreaterThan(0);
    // Document order preserved
    expect([...picked].sort((a, b) => a - b)).toEqual(picked);
  });
});

// ─── Slice 1: perf tuning — sampling, scale, strided image scoring ────

import { PDF_SCORING_CONFIG, pickPagesToAnalyze } from "../pdfToImages";

describe("PDF_SCORING_CONFIG sanity", () => {
  it("analysis scale stays well below OCR scale", () => {
    expect(PDF_SCORING_CONFIG.ANALYSIS_RENDER_SCALE).toBeLessThan(1.0);
    expect(PDF_SCORING_CONFIG.OCR_RENDER_SCALE).toBeGreaterThanOrEqual(1.5);
  });

  it("hard cap is a positive integer", () => {
    expect(Number.isInteger(PDF_SCORING_CONFIG.MAX_PAGES_ANALYZED)).toBe(true);
    expect(PDF_SCORING_CONFIG.MAX_PAGES_ANALYZED).toBeGreaterThan(0);
  });
});

describe("pickPagesToAnalyze", () => {
  it("returns all pages when below the cap", () => {
    expect(pickPagesToAnalyze(8, 25)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("never exceeds the cap for very large documents", () => {
    const picked = pickPagesToAnalyze(60, 25);
    expect(picked.length).toBeLessThanOrEqual(25);
    expect(picked[0]).toBe(1);
    expect(picked[picked.length - 1]).toBe(60);
  });

  it("includes evenly-strided middle pages so a flight page deep in the doc isn't missed", () => {
    const picked = pickPagesToAnalyze(60, 25);
    // page 32 sits in the middle third — should be reachable via the stride
    const middle = picked.filter(p => p > 5 && p < 58);
    expect(middle.length).toBeGreaterThan(5);
    // adjacent gap should never exceed totalPages / cap * 2 (loose upper bound)
    for (let i = 1; i < picked.length; i++) {
      expect(picked[i] - picked[i - 1]).toBeLessThanOrEqual(6);
    }
  });

  it("returns sorted, deduplicated indices", () => {
    const picked = pickPagesToAnalyze(40, 25);
    expect(new Set(picked).size).toBe(picked.length);
    expect([...picked].sort((a, b) => a - b)).toEqual(picked);
  });
});

describe("scoreFlightImage strided sampling parity", () => {
  // Synthetic ticket-like image: alternating dark and light bands.
  function makeBandedImage(width: number, height: number, period = 6) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const dark = Math.floor(y / period) % 2 === 0;
      const v = dark ? 30 : 240;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;
      }
    }
    return { data, width, height };
  }

  it("stride=1 and stride=4 produce comparable ticket-like scores", () => {
    const img = makeBandedImage(120, 160);
    const full = scoreFlightImage(img, { stride: 1 });
    const strided = scoreFlightImage(img, { stride: 4 });
    expect(full).toBeGreaterThan(5);
    expect(strided).toBeGreaterThan(5);
    // Allow a generous tolerance — the contract is "same magnitude / same pick".
    expect(Math.abs(full - strided)).toBeLessThan(8);
  });

  it("blank page scores 0 regardless of stride", () => {
    const blank = {
      data: new Uint8ClampedArray(120 * 160 * 4).fill(255),
      width: 120,
      height: 160,
    };
    expect(scoreFlightImage(blank, { stride: 1 })).toBe(0);
    expect(scoreFlightImage(blank, { stride: 4 })).toBe(0);
  });
});
