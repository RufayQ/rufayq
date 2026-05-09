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
