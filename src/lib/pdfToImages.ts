// PDF page analysis + rendering for the itinerary scanner.
//
// The scanner sends rasterised PDF pages to the multimodal AI (Lovable
// Gateway / Gemini) because Gemini's image_url channel only accepts
// images. For multi-page airline itineraries we want to be smart about
// which pages we send: irrelevant pages (T&Cs, baggage, ads) waste AI
// credits and frequently push the real flight leg out of the AI's
// attention budget.
//
// Strategy:
//   1. analyzePdfPages(file): walks every page (capped), extracts the
//      text layer, scores each page on flight-likeness, and ALSO renders
//      a small thumbnail per page that we can show in a preview UI.
//      For pages with no text layer (scanned PDFs, image-only exports)
//      it falls back to an image-based heuristic computed from the
//      thumbnail itself.
//   2. The UI (or the back-compat helper) picks N "recommended" pages.
//      The user can override the selection.
//   3. renderPdfPagesAtScale(file, pages): renders only the pages that
//      will be sent to the AI, at full scale, returning data URLs.

import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker import
// @ts-ignore – ?url is a Vite suffix
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

// ─── Tunable configuration ─────────────────────────────────────────────
// Single source of truth — never inline magic numbers elsewhere in the file.
export const PDF_SCORING_CONFIG = {
  MAX_PAGES_ANALYZED: 25,        // hard cap on pages rendered for scoring
  ANALYSIS_RENDER_SCALE: 0.6,    // thumbnail scale for scoring pass only
  OCR_RENDER_SCALE: 2.0,         // full scale for pages sent to OCR
  IMAGE_SAMPLE_STRIDE: 4,        // sample every Nth row/col in image scoring
  EARLY_EXIT_MIN_CHARS: 40,      // skip image scoring if text < this length
  SAMPLE_FIRST_N: 5,             // pages always included from the start
  SAMPLE_LAST_N: 3,              // pages always included from the end
} as const;

/**
 * Choose which page indices (1-based) to actually render and score when a
 * document exceeds MAX_PAGES_ANALYZED. Always includes the first N and
 * last N pages, then fills the remainder with an evenly strided sample
 * across the middle so we never miss a flight page sitting deep inside a
 * 60-page itinerary bundle.
 */
export function pickPagesToAnalyze(totalPages: number, cap = PDF_SCORING_CONFIG.MAX_PAGES_ANALYZED): number[] {
  if (totalPages <= cap) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const firstN = Math.min(PDF_SCORING_CONFIG.SAMPLE_FIRST_N, cap);
  const lastN = Math.min(PDF_SCORING_CONFIG.SAMPLE_LAST_N, Math.max(0, cap - firstN));
  const set = new Set<number>();
  for (let i = 1; i <= firstN; i++) set.add(i);
  for (let i = totalPages - lastN + 1; i <= totalPages; i++) set.add(i);
  const remaining = cap - set.size;
  if (remaining > 0) {
    const middleStart = firstN + 1;
    const middleEnd = totalPages - lastN;
    const middleCount = Math.max(0, middleEnd - middleStart + 1);
    if (middleCount > 0) {
      const stride = Math.max(1, Math.ceil(middleCount / remaining));
      for (let i = middleStart; i <= middleEnd && set.size < cap; i += stride) set.add(i);
    }
  }
  return [...set].sort((a, b) => a - b);
}

// ─── Types ──────────────────────────────────────────────────────────────

export interface PdfPageInfo {
  pageIndex: number; // 1-based
  /** Composite score (text-based when text exists, image-based otherwise). */
  score: number;
  /** Sub-score from extracted text layer (0 if no text layer). */
  textScore: number;
  /** Sub-score from image heuristic on the thumbnail (always populated). */
  imageScore: number;
  /** True when the page had a usable extractable text layer. */
  hasText: boolean;
  /** Low-resolution preview of the page for the picker UI. */
  thumbDataUrl: string;
  /** Thumbnail aspect ratio (width / height). */
  aspect: number;
}

export interface PdfAnalysis {
  totalPages: number;
  /** All scanned pages in document order (capped to `hardCap`). */
  pages: PdfPageInfo[];
  /** Page indices (1-based) the heuristic recommends extracting. */
  recommended: number[];
  /** True when every page had no text layer (likely a scanned PDF). */
  scannedFallback: boolean;
}

// ─── Public API ─────────────────────────────────────────────────────────

/** Backwards-compatible thin renderer (still used by other call sites). */
export async function pdfToImageDataUrls(file: File, opts?: { maxPages?: number; scale?: number }): Promise<string[]> {
  const maxPages = opts?.maxPages ?? 2;
  const scale = opts?.scale ?? 2;
  const pdf = await loadPdf(file);
  const pages = Math.min(pdf.numPages, maxPages);
  const out: string[] = [];
  for (let i = 1; i <= pages; i++) out.push(await renderPageToDataUrl(pdf, i, scale));
  return out;
}

/**
 * Analyse every page of a PDF: text-score, image-score, and a thumbnail
 * we can render in the preview/manual-pick UI.
 */
export async function analyzePdfPages(
  file: File,
  opts?: { hardCap?: number; thumbScale?: number; topN?: number },
): Promise<PdfAnalysis> {
  const hardCap = opts?.hardCap ?? 12;
  const thumbScale = opts?.thumbScale ?? 0.45;
  const topN = opts?.topN ?? 2;

  const pdf = await loadPdf(file);
  const totalPages = pdf.numPages as number;
  const pageCount = Math.min(totalPages, hardCap);

  const pages: PdfPageInfo[] = [];
  let scannedFallback = true;

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);

    // Render thumbnail (also used for the image heuristic)
    const viewport = page.getViewport({ scale: thumbScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get 2d canvas context");
    await page.render({ canvasContext: ctx, viewport }).promise;
    const thumbDataUrl = canvas.toDataURL("image/jpeg", 0.7);

    // Text layer (some PDFs have none → rely on image score).
    let text = "";
    try {
      const tc = await page.getTextContent();
      text = (tc.items || []).map((it: any) => it.str || "").join(" ");
    } catch {
      text = "";
    }
    const hasText = text.trim().length > 20;
    if (hasText) scannedFallback = false;

    const textScore = hasText ? scoreFlightText(text) : 0;

    // Image heuristic (always computed; primary signal when no text layer).
    let imageScore = 0;
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      imageScore = scoreFlightImage(imgData);
    } catch (e) {
      // canvas could be tainted in rare cases — fall back to neutral
      imageScore = 0;
    }

    // Composite: when text is present, trust it; otherwise use image score.
    // Always blend a small slice of imageScore so a strongly-tabular page
    // wins over a text-only page that's mostly legalese.
    const score = hasText ? textScore + imageScore * 0.3 : imageScore;

    pages.push({
      pageIndex: i,
      score,
      textScore,
      imageScore,
      hasText,
      thumbDataUrl,
      aspect: canvas.width / canvas.height,
    });
  }

  const recommended = recommendPages(pages, topN);

  console.info(
    "[analyzePdfPages] total=%d analysed=%d scannedFallback=%s recommended=%o",
    totalPages, pageCount, scannedFallback, recommended.map(i => ({
      page: i,
      score: pages[i - 1]?.score?.toFixed(2),
    })),
  );

  return { totalPages, pages, recommended, scannedFallback };
}

/** Render specific pages at full scale, returning data URLs in original page order. */
export async function renderPdfPagesAtScale(
  file: File,
  pageIndices: number[],
  scale = 2,
): Promise<string[]> {
  if (pageIndices.length === 0) return [];
  const pdf = await loadPdf(file);
  const ordered = [...pageIndices].sort((a, b) => a - b);
  const out: string[] = [];
  for (const idx of ordered) {
    if (idx < 1 || idx > pdf.numPages) continue;
    out.push(await renderPageToDataUrl(pdf, idx, scale));
  }
  return out;
}

/**
 * One-shot helper: analyse + render the recommended pages. Kept so
 * callers that don't need the manual picker UI still work.
 */
export async function pdfToBestFlightImages(
  file: File,
  opts?: { topN?: number; hardCap?: number; scale?: number },
): Promise<{ images: string[]; pages: { pageIndex: number; score: number }[]; totalPages: number }> {
  const analysis = await analyzePdfPages(file, { hardCap: opts?.hardCap ?? 12, topN: opts?.topN ?? 2 });
  const images = await renderPdfPagesAtScale(file, analysis.recommended, opts?.scale ?? 2);
  return {
    images,
    pages: analysis.recommended.map(i => ({ pageIndex: i, score: analysis.pages[i - 1]?.score ?? 0 })),
    totalPages: analysis.totalPages,
  };
}

// ─── Pick logic ─────────────────────────────────────────────────────────

export function recommendPages(pages: PdfPageInfo[], topN: number): number[] {
  if (pages.length === 0) return [];
  const anyScore = pages.some(p => p.score > 0);
  if (!anyScore) {
    // No signals at all — default to the first N pages.
    return pages.slice(0, topN).map(p => p.pageIndex);
  }
  // Pick the top scorers, then return them in document order.
  return [...pages]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topN))
    .map(p => p.pageIndex)
    .sort((a, b) => a - b);
}

// ─── Text-based scoring (PDFs with a text layer) ───────────────────────

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
 * bookable flight leg. Tuned so a real itinerary page beats T&Cs,
 * baggage charts, and ad pages, even when the PDF runs many pages.
 */
export function scoreFlightText(raw: string): number {
  if (!raw) return 0;
  const t = raw.toLowerCase();
  let score = 0;

  for (const kw of FLIGHT_KEYWORDS) if (t.includes(kw)) score += 3;
  for (const a of AIRLINE_HINTS) if (t.includes(a)) score += 2;

  const upper = raw.toUpperCase();
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

// ─── Image-based scoring (scanned PDFs / no text layer) ────────────────

/**
 * Image heuristic for pages with no extractable text. We can't OCR
 * client-side cheaply, so we look for the *visual signature* of a
 * ticket: a structured page with text rows (bands of consistent ink
 * density alternating with whitespace), avoiding mostly-blank pages
 * and full-bleed marketing photos.
 *
 * Inputs:
 *   imgData: ImageData from a low-res thumbnail (ideally width ~150).
 *
 * Output: roughly 0..30, comparable in magnitude to scoreFlightText.
 */
export function scoreFlightImage(imgData: { data: Uint8ClampedArray | number[]; width: number; height: number }): number {
  const { data, width, height } = imgData;
  if (width < 4 || height < 4) return 0;

  // Per-row darkness (0..255). darkness = 255 - avg luminance.
  const rowDark = new Float32Array(height);
  let totalDark = 0;
  for (let y = 0; y < height; y++) {
    let sum = 0;
    const yOff = y * width * 4;
    for (let x = 0; x < width; x++) {
      const i = yOff + x * 4;
      // Quick luminance approximation
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
      sum += 255 - lum;
    }
    rowDark[y] = sum / width;
    totalDark += rowDark[y];
  }
  const meanDark = totalDark / height;
  const inkRatio = meanDark / 255; // 0..1

  // Pages too blank or too saturated → not an itinerary
  if (inkRatio < 0.015) return 0;          // basically empty page
  if (inkRatio > 0.55) return 1;           // photo / dark cover

  // Row-darkness variance: text pages have alternating dark (text) and
  // light (gutter) rows, giving high variance. Photo pages and solid
  // colour pages have uniformly distributed darkness → low variance.
  let varSum = 0;
  for (let y = 0; y < height; y++) {
    const d = rowDark[y] - meanDark;
    varSum += d * d;
  }
  const variance = varSum / height;
  const std = Math.sqrt(variance);

  // Count "text-like" row transitions: how many rows cross the mean.
  let crossings = 0;
  for (let y = 1; y < height; y++) {
    const a = rowDark[y - 1] - meanDark;
    const b = rowDark[y] - meanDark;
    if ((a < 0 && b >= 0) || (a >= 0 && b < 0)) crossings++;
  }
  // Expected: roughly 2 crossings per text line → many lines → many crossings.
  const crossingsRatio = crossings / height; // 0..1

  // Compose a score in roughly the same magnitude as scoreFlightText:
  //   - std contributes up to ~15
  //   - crossingsRatio contributes up to ~10
  //   - mid-range ink density gets a small bonus, very-light/very-dark a penalty
  let score = Math.min(15, std / 4);
  score += Math.min(10, crossingsRatio * 40);
  if (inkRatio >= 0.05 && inkRatio <= 0.3) score += 4; // ticket-ish density
  if (inkRatio > 0.4) score -= 4;                       // probably an image
  return Math.max(0, score);
}

// ─── Internals ─────────────────────────────────────────────────────────

async function loadPdf(file: File): Promise<any> {
  const buf = await file.arrayBuffer();
  return (pdfjsLib as any).getDocument({ data: buf }).promise;
}

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
