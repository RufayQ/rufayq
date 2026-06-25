/**
 * Per-document viewer state persistence.
 *
 * Persists page / zoom / search query across route changes and reloads.
 * Keyed by a stable hash of the document URL so signed-URL tokens don't
 * leak into storage.
 */
import { hashUrl } from "./pdfAnalytics";

export interface PdfViewerState {
  page: number;
  zoom: number;
  zoomMode: "fit" | "manual";
  searchTerm: string;
  searchOpen: boolean;
  updatedAt: number;
}

const KEY = (urlHash: string) => `rufayq.pdfViewer.${urlHash}`;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const loadPdfViewerState = (url: string): Partial<PdfViewerState> | null => {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(KEY(hashUrl(url)));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PdfViewerState;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const savePdfViewerState = (url: string, state: Partial<PdfViewerState>): void => {
  try {
    if (typeof window === "undefined") return;
    const merged: PdfViewerState = {
      page: 1,
      zoom: 1,
      zoomMode: "fit",
      searchTerm: "",
      searchOpen: false,
      ...state,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(KEY(hashUrl(url)), JSON.stringify(merged));
  } catch {
    /* quota / private-mode — ignore */
  }
};

export const clearPdfViewerState = (url: string): void => {
  try { window.localStorage.removeItem(KEY(hashUrl(url))); } catch { /* ignore */ }
};
