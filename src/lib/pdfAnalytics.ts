/**
 * Structured analytics for the unified PDF viewer.
 *
 * Emits browser CustomEvents on `window` (so any monitoring shim — Segment,
 * GA, internal QC bus — can listen) and forwards to optional subscribers.
 * Keep payloads small and PII-free: we send a stable URL hash, not the
 * signed URL itself.
 */
export type PdfAnalyticsEvent =
  | "pdf_load_started"
  | "pdf_load_succeeded"
  | "pdf_load_failed"
  | "pdf_retry"
  | "pdf_download"
  | "pdf_page_view"
  | "pdf_zoom_change"
  | "pdf_search";

export interface PdfAnalyticsPayload {
  event: PdfAnalyticsEvent;
  urlHash: string;
  fileName: string;
  numPages?: number;
  page?: number;
  zoom?: number;
  durationMs?: number;
  errorMessage?: string;
  retryAttempt?: number;
  searchTerm?: string;
  searchMatches?: number;
  timestamp: number;
}

type Listener = (payload: PdfAnalyticsPayload) => void;
const listeners = new Set<Listener>();

/** Stable, non-reversible URL hash — avoids leaking signed tokens. */
export const hashUrl = (url: string): string => {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = ((h << 5) - h + url.charCodeAt(i)) | 0;
  return `u${(h >>> 0).toString(36)}`;
};

export const subscribePdfAnalytics = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const emitPdfAnalytics = (payload: Omit<PdfAnalyticsPayload, "timestamp">): void => {
  const full: PdfAnalyticsPayload = { ...payload, timestamp: Date.now() };
  try {
    for (const l of Array.from(listeners)) {
      try { l(full); } catch { /* never let a listener break the viewer */ }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rufayq:pdf-analytics", { detail: full }));
    }
  } catch { /* swallow */ }
};
