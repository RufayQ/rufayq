/**
 * Local store for travel-side scanned documents (visas, passports, residency
 * permits, insurance cards, hotel bookings…) created via the Scanner wizard.
 *
 * File previews live in IndexedDB (`recordBlobDb`) keyed by `${id}:file`,
 * `${id}:pdf`, and `${id}:pages`. localStorage only ever holds metadata.
 */
import {
  cacheRecordBlob,
  dropCachedRecordBlob,
  getCachedRecordBlob,
  isHeavyDataUrl,
} from "@/lib/records/recordBlobCache";
import { deleteRecordBlob, resolveRecordBlobUrl } from "@/lib/records/recordBlobDb";
import { normalizeBlobBase, slotKey, type BlobSlot } from "@/lib/records/blobKeyUtil";

const STORAGE_KEY = "rufayq_travel_scanned_records_v1";
const UPDATE_EVENT = "rufayq:travel-scanned-records-updated";

/** Subset of scanner categories that should land in the Travel tab. */
const TRAVEL_CATEGORIES = new Set(["legal", "hotel", "train", "flight"]);
export const isTravelCategory = (cat: string | null | undefined): boolean =>
  !!cat && TRAVEL_CATEGORIES.has(cat);

export interface TravelScannedRecord {
  id: string;
  createdAt: string;
  category: string;
  subcategory: string | null;
  title: string;
  fileName: string;
  pageCount: number;
  keyFields?: { label: string; value: string }[];
  pageImages?: string[];
  pdfUrl?: string;
  fileUrl?: string;
  mimeType?: string | null;
  /** IndexedDB blob key prefix (`${id}` by default). Slots: `:file`, `:pdf`, `:pages`. */
  blobKey?: string;
  fileBytes?: number;
}

/** Base blob key for a record — strips any trailing :file/:pdf/:pages slot
 *  that callers (e.g. ScannerWizard.finalizePayload) may have pre-suffixed,
 *  so the per-slot keys we generate here line up with what was stored. */
const baseBlobKey = (r: TravelScannedRecord): string => {
  const raw = r.blobKey || r.id;
  return raw.replace(/:(file|pdf|pages)$/, "");
};
const blobKeyFor = (r: TravelScannedRecord, slot: "file" | "pdf" | "pages") =>
  `${baseBlobKey(r)}:${slot}`;

const slimFor = (r: TravelScannedRecord): TravelScannedRecord => {
  let next = r;
  if (r?.id && isHeavyDataUrl(r.fileUrl)) {
    cacheRecordBlob(blobKeyFor(r, "file"), r.fileUrl as string);
    const { fileUrl: _u, ...rest } = next;
    next = rest as TravelScannedRecord;
  } else if (r?.fileUrl?.startsWith("blob:")) {
    const { fileUrl: _u, ...rest } = next;
    next = rest as TravelScannedRecord;
  }
  if (r?.id && isHeavyDataUrl(r.pdfUrl)) {
    cacheRecordBlob(blobKeyFor(r, "pdf"), r.pdfUrl as string);
    const { pdfUrl: _p, ...rest } = next;
    next = rest as TravelScannedRecord;
  } else if (r?.pdfUrl?.startsWith("blob:")) {
    const { pdfUrl: _p, ...rest } = next;
    next = rest as TravelScannedRecord;
  }
  if (r?.id && Array.isArray(r.pageImages) && r.pageImages.some((p) => isHeavyDataUrl(p))) {
    cacheRecordBlob(blobKeyFor(r, "pages"), JSON.stringify(r.pageImages));
    const { pageImages: _pi, ...rest } = next;
    next = rest as TravelScannedRecord;
  }
  return next;
};

const rehydrate = (r: TravelScannedRecord): TravelScannedRecord => {
  if (!r?.id) return r;
  let next = r;
  if (!next.fileUrl) {
    const cached = getCachedRecordBlob(blobKeyFor(next, "file"));
    if (cached) next = { ...next, fileUrl: cached };
  }
  if (!next.pdfUrl) {
    const cached = getCachedRecordBlob(blobKeyFor(next, "pdf"));
    if (cached) next = { ...next, pdfUrl: cached };
  }
  if (!next.pageImages) {
    const cached = getCachedRecordBlob(blobKeyFor(next, "pages"));
    if (cached) {
      try { next = { ...next, pageImages: JSON.parse(cached) }; } catch { /* noop */ }
    }
  }
  return next;
};

let hydrationStarted = false;

const read = (): TravelScannedRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items = parsed.map(rehydrate);
    if (!hydrationStarted) {
      hydrationStarted = true;
      void hydrateMissingPreviews(items);
    }
    return items;
  } catch {
    return [];
  }
};

const hydrateMissingPreviews = async (items: TravelScannedRecord[]) => {
  let dirty = false;
  for (const r of items) {
    if (!r?.id) continue;
    if (!r.fileUrl && !getCachedRecordBlob(blobKeyFor(r, "file"))) {
      try { if (await resolveRecordBlobUrl(blobKeyFor(r, "file"))) dirty = true; } catch { /* noop */ }
    }
    if (!r.pdfUrl && !getCachedRecordBlob(blobKeyFor(r, "pdf"))) {
      try { if (await resolveRecordBlobUrl(blobKeyFor(r, "pdf"))) dirty = true; } catch { /* noop */ }
    }
  }
  if (dirty) {
    try { window.dispatchEvent(new CustomEvent(UPDATE_EVENT)); } catch { /* noop */ }
  }
};

const write = (items: TravelScannedRecord[]) => {
  const slim = items.map(slimFor);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch (e) {
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
  fileBytes?: number;
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
    blobKey: input.blobKey || id,
    fileBytes: input.fileBytes,
  };
  write([rec, ...read()]);
  return rec;
};

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
  const all = read();
  const target = all.find((r) => r.id === id);
  const base = (target?.blobKey || id).replace(/:(file|pdf|pages)$/, "");
  dropCachedRecordBlob(`${base}:file`);
  dropCachedRecordBlob(`${base}:pdf`);
  dropCachedRecordBlob(`${base}:pages`);
  void deleteRecordBlob(`${base}:file`);
  void deleteRecordBlob(`${base}:pdf`);
  void deleteRecordBlob(`${base}:pages`);
  write(all.filter((r) => r.id !== id));
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
