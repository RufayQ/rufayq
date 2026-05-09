// Render PDF pages to PNG data URLs in the browser using pdfjs-dist.
// Used by the itinerary scanner so multimodal AI can read PDF tickets
// (Lovable AI Gateway / Gemini accepts images, not PDFs, via image_url).

import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker import
// @ts-ignore – ?url is a Vite suffix
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

export async function pdfToImageDataUrls(file: File, opts?: { maxPages?: number; scale?: number }): Promise<string[]> {
  const maxPages = opts?.maxPages ?? 2;
  const scale = opts?.scale ?? 2;
  const buf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const out: string[] = [];
  const pages = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= pages; i++) {
    out.push(await renderPageToDataUrl(pdf, i, scale));
  }
  return out;
}

/**
 * Multi-page-aware variant for flight tickets.
 *
 * Some carriers (Saudia, flynas, Emirates) ship 6-12 page PDFs that mix
 * marketing pages, T&Cs, baggage rules, lounge ads and (somewhere in the
 * middle) the actual itinerary. Rendering pages 1-2 blindly often misses
 * the flight legs and the AI returns nothing.
 *
 * Strategy:
 *  1. Walk every page (capped to `hardCap`) and extract its text layer.
 *  2. Score each page on flight signals (IATA codes, "FLIGHT", "PNR",
 *     dep/arr times, ticket numbers, airline keywords).
 *  3. Render only the top `topN` scoring pages to images and return them
 *     in original document order.
 *
 * Falls back to the first 2 pages when scoring is inconclusive (e.g.
 * scanned PDF with no text layer).
 */
export interface ScoredPage {
  pageIndex: number; // 1-based
  score: number;
  dataUrl: string;
}

export async function pdfToBestFlightImages(
  file: File,
  opts?: { topN?: number; hardCap?: number; scale?: number },
): Promise<{ images: string[]; pages: ScoredPage[]; totalPages: number }> {
  const topN = opts?.topN ?? 2;
  const hardCap = opts?.hardCap ?? 12;
  const scale = opts?.scale ?? 2;

  const buf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const totalPages = pdf.numPages as number;
  const pageCount = Math.min(totalPages, hardCap);

  // 1. Score every page from its text layer.
  type Scored = { pageIndex: number; score: number; hasText: boolean };
  const scored: Scored[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    let text = "";
    try {
      const tc = await page.getTextContent();
      text = (tc.items || []).map((it: any) => it.str || "").join(" ");
    } catch {
      text = "";
    }
    scored.push({ pageIndex: i, score: scoreFlightText(text), hasText: text.trim().length > 20 });
  }

  // 2. Pick the top-scoring pages. If nothing scored (scanned PDF with no
  //    text layer), fall back to the first `topN` pages.
  const anyScore = scored.some(s => s.score > 0);
  const anyText = scored.some(s => s.hasText);
  let chosen: Scored[];
  if (!anyScore) {
    // No flight signals found. If there's no text layer at all, this is
    // probably scanned — render the first N pages and let the AI try.
    // If there IS text but no signals, render the first N anyway.
    chosen = scored.slice(0, topN);
  } else {
    const sorted = [...scored].sort((a, b) => b.score - a.score).slice(0, Math.max(1, topN));
    chosen = sorted.sort((a, b) => a.pageIndex - b.pageIndex);
  }

  // 3. Render the chosen pages.
  const pages: ScoredPage[] = [];
  for (const c of chosen) {
    const dataUrl = await renderPageToDataUrl(pdf, c.pageIndex, scale);
    pages.push({ pageIndex: c.pageIndex, score: c.score, dataUrl });
  }

  // Diagnostic — helps when a particular ticket layout misbehaves.
  console.info(
    "[pdfToBestFlightImages] total=%d scanned=%d hasText=%s anyScore=%s chosen=%o",
    totalPages, pageCount, anyText, anyScore,
    pages.map(p => ({ page: p.pageIndex, score: p.score })),
  );

  return { images: pages.map(p => p.dataUrl), pages, totalPages };
}

// ─── helpers ────────────────────────────────────────────────────────────

async function renderPageToDataUrl(pdf: any, pageIndex: number, scale: number): Promise<string> {
  const page = await pdf.getPage(pageIndex);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d canvas context");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/png");
}

const AIRLINE_HINTS = [
  "saudia", "flynas", "air arabia", "emirates", "etihad", "qatar airways",
  "turkish airlines", "lufthansa", "british airways", "klm", "air france",
  "egyptair", "gulf air", "kuwait airways", "oman air", "pegasus",
];

const FLIGHT_KEYWORDS = [
  "flight", "boarding", "boarding pass", "departure", "arrival",
  "passenger", "pnr", "booking ref", "booking reference", "ticket no",
  "ticket number", "seat", "gate", "terminal", "baggage allowance",
  "fare basis", "etkt", "e-ticket",
];

const TIME_RE = /\b\d{1,2}:\d{2}\b/g;
const DATE_RE = /\b(\d{1,2}\s?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s?\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/gi;
const IATA_RE = /\b[A-Z]{3}\b/g;
const FLIGHT_NUM_RE = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?\d{1,4}\b/g;

/**
 * Heuristic flight-likeness score. Higher = more likely to contain a
 * bookable flight leg. Tuned so that a real itinerary page beats T&Cs,
 * baggage charts, and ad pages, even when the PDF runs to many pages.
 */
export function scoreFlightText(raw: string): number {
  if (!raw) return 0;
  const t = raw.toLowerCase();
  let score = 0;

  for (const kw of FLIGHT_KEYWORDS) if (t.includes(kw)) score += 3;
  for (const a of AIRLINE_HINTS) if (t.includes(a)) score += 2;

  const upper = raw.toUpperCase();
  // Real IATA codes (3 capital letters surrounded by non-letters). Cap to
  // avoid pages full of capitalised acronyms (legal pages) winning.
  const iatas = upper.match(IATA_RE) || [];
  score += Math.min(iatas.length, 6);

  const flightNums = upper.match(FLIGHT_NUM_RE) || [];
  score += Math.min(flightNums.length, 4) * 2;

  const times = raw.match(TIME_RE) || [];
  score += Math.min(times.length, 4);

  const dates = raw.match(DATE_RE) || [];
  score += Math.min(dates.length, 3) * 2;

  // Penalise obvious non-itinerary pages.
  if (/terms\s+and\s+conditions|conditions\s+of\s+carriage|privacy\s+policy/i.test(raw)) score -= 8;
  if (/baggage\s+allowance\s+chart|prohibited\s+items/i.test(raw)) score -= 4;

  return Math.max(0, score);
}
