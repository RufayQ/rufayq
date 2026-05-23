/**
 * Local store for travel-side scanned documents (visas, passports, residency
 * permits, insurance cards, hotel bookings…) created via the Scanner wizard.
 *
 * Mirrors scannedRecordsStore in shape, but is consumed by the Travel
 * Records list instead of the Medical Records screen. We keep it local-only
 * for now (the DB-backed `transport_attachments` table requires a real file
 * upload + ownership scope, which isn't always available at save time —
 * especially for guest sessions or for non-flight scanner flows).
 */
import {
  cacheRecordBlob,
  dropCachedRecordBlob,
  getCachedRecordBlob,
  isHeavyDataUrl,
} from "@/lib/records/recordBlobCache";
import { getScannerBlob } from "@/lib/records/scannerFileStore";

const STORAGE_KEY = "rufayq_travel_scanned_records_v1";
const UPDATE_EVENT = "rufayq:travel-scanned-records-updated";

/** Subset of scanner categories that should land in the Travel tab. */
const TRAVEL_CATEGORIES = new Set(["legal", "hotel", "train", "flight"]);
export const isTravelCategory = (cat: string | null | undefined): boolean =>
  !!cat && TRAVEL_CATEGORIES.has(cat);

export interface TravelScannedRecord {
  id: string;
  createdAt: string;
  category: string;          // scanner category (e.g. "legal")
  subcategory: string | null; // e.g. "Visa"
  title: string;             // user-facing label
  fileName: string;          // original captured file name
  pageCount: number;
  keyFields?: { label: string; value: string }[];
  /** Captured page images (data URLs) used for in-app preview / fullscreen. */
  pageImages?: string[];
  /** Optional source PDF URL (signed/blob/data) used when pageImages is empty. */
  pdfUrl?: string;
  /** Optional original file URL (blob/signed/data) used for PDF/Office/image fallback preview. */
  fileUrl?: string;
  /** MIME type of the original uploaded document. */
  mimeType?: string | null;
  blobKey?: string;
}

const slimFor = (r: TravelScannedRecord): TravelScannedRecord => {
  let next = r;
  if (r?.id && isHeavyDataUrl(r.fileUrl)) {
    cacheRecordBlob(`${r.id}:file`, r.fileUrl as string);
    const { fileUrl: _u, ...rest } = next;
    next = rest as TravelScannedRecord;
  }
  if (r?.id && isHeavyDataUrl(r.pdfUrl)) {
    cacheRecordBlob(`${r.id}:pdf`, r.pdfUrl as string);
    const { pdfUrl: _p, ...rest } = next;
    next = rest as TravelScannedRecord;
  }
  // pageImages arrays of data URLs are far too large for localStorage.
  if (r?.id && Array.isArray(r.pageImages) && r.pageImages.some((p) => isHeavyDataUrl(p))) {
    cacheRecordBlob(`${r.id}:pages`, JSON.stringify(r.pageImages));
    const { pageImages: _pi, ...rest } = next;
    next = rest as TravelScannedRecord;
  }
  return next;
};

const rehydrate = (r: TravelScannedRecord): TravelScannedRecord => {
  if (!r?.id) return r;
  let next = r;
  if (!next.fileUrl) {
    const cached = getCachedRecordBlob(`${next.id}:file`);
    if (cached) next = { ...next, fileUrl: cached };
  }
  if (!next.pdfUrl) {
    const cached = getCachedRecordBlob(`${next.id}:pdf`);
    if (cached) next = { ...next, pdfUrl: cached };
  }
  if (!next.pageImages) {
    const cached = getCachedRecordBlob(`${next.id}:pages`);
    if (cached) {
      try { next = { ...next, pageImages: JSON.parse(cached) }; } catch { /* noop */ }
    }
  }
  return next;
};

const read = (): TravelScannedRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(rehydrate);
  } catch {
    return [];
  }
};

const write = (items: TravelScannedRecord[]) => {
  const slim = items.map(slimFor);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch (e) {
    // Quota fallback: drop every remaining heavy field so metadata persists.
    try {
      const minimal = slim.map(({ fileUrl: _f, pdfUrl: _p, pageImages: _pi, ...rest }) => rest as TravelScannedRecord);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
      console.warn("[travelScannedRecords] persisted without heavy fields after quota error", e);
    } catch (e2) {
      console.warn("[travelScannedRecords] persist failed", e2);
    }
  }
};

export const listTravelScannedRecords = (): TravelScannedRecord[] => read();

export const rehydrateTravelScannedRecordUrls = async (): Promise<void> => {
  const all = read();
  let touched = false;
  for (const r of all) {
    if (!r.fileUrl && r.blobKey) {
      try {
        const blob = await getScannerBlob(r.blobKey);
        if (blob) {
          r.fileUrl = URL.createObjectURL(blob);
          touched = true;
        }
      } catch { /* noop */ }
    }
  }
  if (touched) write(all);
};

export const addTravelScannedRecord = (input: {
  category: string;
  subcategory?: string | null;
  title?: string;
  fileName?: string;
  pageCount?: number;
  keyFields?: { label: string; value: string }[];
  pageImages?: string[];
  pdfUrl?: string;
  fileUrl?: string;
  mimeType?: string | null;
  blobKey?: string;
}): TravelScannedRecord => {
  const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `tsr-${Date.now()}`;
  const title =
    input.title?.trim() ||
    input.subcategory?.trim() ||
    input.fileName?.replace(/\.\w+$/, "") ||
    "Travel Document";
  const rec: TravelScannedRecord = {
    id,
    createdAt: new Date().toISOString(),
    category: input.category,
    subcategory: input.subcategory ?? null,
    title,
    fileName: input.fileName || `${title}.pdf`,
    pageCount: input.pageCount || (input.pageImages?.length || 1),
    keyFields: input.keyFields,
    pageImages: input.pageImages,
    pdfUrl: input.pdfUrl,
    fileUrl: input.fileUrl,
    mimeType: input.mimeType ?? null,
    blobKey: input.blobKey,
  };
  write([rec, ...read()]);
  return rec;
};

/** Patch an existing travel scanned record (title / keyFields / etc.). */
export const updateTravelScannedRecord = (
  id: string,
  patch: Partial<Pick<TravelScannedRecord, "title" | "subcategory" | "keyFields" | "fileName" | "fileUrl" | "mimeType" | "pdfUrl">>,
): TravelScannedRecord | null => {
  const all = read();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const next = { ...all[idx], ...patch };
  all[idx] = next;
  write(all);
  return next;
};

export const removeTravelScannedRecord = (id: string) => {
  dropCachedRecordBlob(`${id}:file`);
  dropCachedRecordBlob(`${id}:pdf`);
  dropCachedRecordBlob(`${id}:pages`);
  write(read().filter((r) => r.id !== id));
};

export const subscribeToTravelScannedRecords = (handler: () => void): (() => void) => {
  const wrapped = () => handler();
  window.addEventListener(UPDATE_EVENT, wrapped);
  window.addEventListener("storage", wrapped);
  return () => {
    window.removeEventListener(UPDATE_EVENT, wrapped);
    window.removeEventListener("storage", wrapped);
  };
};
