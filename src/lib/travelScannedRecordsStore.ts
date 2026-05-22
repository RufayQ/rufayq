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
}

const read = (): TravelScannedRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (items: TravelScannedRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch (e) {
    console.warn("[travelScannedRecords] persist failed", e);
  }
};

export const listTravelScannedRecords = (): TravelScannedRecord[] => read();

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
