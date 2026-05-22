/**
 * Lightweight localStorage-backed store for medical/legal documents created
 * via the Scanner wizard. Until the full Supabase medical_records pipeline is
 * wired up for real users, this lets scanned items appear in the Records
 * screen immediately so users see what they just captured.
 */
import type { DocRecord } from "@/constants/data";
import {
  cacheRecordBlob,
  dropCachedRecordBlob,
  getCachedRecordBlob,
  isHeavyDataUrl,
} from "@/lib/records/recordBlobCache";

const STORAGE_KEY = "rufayq_scanned_records_v1";
const UPDATE_EVENT = "rufayq:scanned-records-updated";

const CATEGORY_LABEL: Record<string, { en: string; emoji: string; accent: string; bg: string }> = {
  lab:          { en: "Lab Results",    emoji: "🔬", accent: "var(--success)",  bg: "#E8F5EE" },
  prescription: { en: "Prescriptions",  emoji: "💊", accent: "var(--teal-deep)", bg: "var(--teal-light)" },
  discharge:    { en: "Discharge",      emoji: "📋", accent: "var(--gold)",      bg: "var(--gold-pale)" },
  imaging:      { en: "Imaging",        emoji: "🩻", accent: "var(--gray)",      bg: "#F0F2F5" },
  insurance:    { en: "Insurance",      emoji: "🛡️", accent: "#7C5CFC",          bg: "#EDE8FD" },
  // NOTE: `legal` (passport/visa/residency) is intentionally NOT listed here —
  // those documents belong to Travel Records, not Medical Records. See
  // src/lib/travelScannedRecordsStore.ts for the travel-side store.
  other:        { en: "Consultations",  emoji: "📄", accent: "var(--navy)",      bg: "var(--off-white)" },
};

const MEDICAL_CATEGORIES = new Set(Object.keys(CATEGORY_LABEL));

export const isMedicalCategory = (cat: string | null | undefined): boolean =>
  !!cat && MEDICAL_CATEGORIES.has(cat);

export interface ScannedRecord extends DocRecord {
  id: string;
  createdAt: string;
  scannedCategory: string;
  /** Object URL / signed URL for the uploaded source file so records can be previewed. */
  fileUrl?: string;
  /** MIME type for PDF/Office/image preview fallback routing. */
  mimeType?: string | null;
  /** Original uploaded filename. */
  fileName?: string;
}

const read = (): ScannedRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Rehydrate any heavy file payloads kept in the in-memory cache for this session.
    return parsed.map((r: ScannedRecord) => {
      if (!r?.fileUrl && r?.id) {
        const cached = getCachedRecordBlob(r.id);
        if (cached) return { ...r, fileUrl: cached };
      }
      return r;
    });
  } catch {
    return [];
  }
};

const write = (items: ScannedRecord[]) => {
  // Move heavy data URLs into the in-memory cache so localStorage stays small.
  const slim = items.map((r) => {
    if (r?.id && isHeavyDataUrl(r.fileUrl)) {
      cacheRecordBlob(r.id, r.fileUrl as string);
      const { fileUrl: _fileUrl, ...rest } = r;
      return rest as ScannedRecord;
    }
    return r;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch (e) {
    // Last-ditch: retry once after dropping every fileUrl so the metadata
    // at least persists instead of the whole batch disappearing.
    try {
      const minimal = slim.map(({ fileUrl: _f, ...rest }) => rest as ScannedRecord);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
      console.warn("[scannedRecords] persisted without fileUrl after quota error", e);
    } catch (e2) {
      console.warn("[scannedRecords] persist failed", e2);
    }
  }
};

export const listScannedRecords = (): ScannedRecord[] => read();

export const addScannedRecord = (input: {
  category: string;
  titleEn?: string;
  titleAr?: string;
  source?: string;
  meta?: string;
  pageCount?: number;
  keyFields?: { label: string; value: string }[];
  fileUrl?: string;
  mimeType?: string | null;
  fileName?: string;
}): ScannedRecord => {
  const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `rec-${Date.now()}`;
  const meta = CATEGORY_LABEL[input.category] || CATEGORY_LABEL.other;
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const titleEn = input.titleEn?.trim() || `${meta.en} document`;
  const rec: ScannedRecord = {
    id,
    createdAt: now.toISOString(),
    scannedCategory: input.category,
    emoji: meta.emoji,
    titleEn,
    titleAr: input.titleAr || titleEn,
    isNew: true,
    date: dateLabel,
    addedDate: dateLabel,
    meta: input.meta || `${input.pageCount || 1} page${(input.pageCount || 1) === 1 ? "" : "s"} · Scanned just now`,
    bgColor: meta.bg,
    accentColor: meta.accent,
    category: meta.en,
    pages: input.pageCount || 1,
    source: input.source || "RufayQ Scanner",
    translationStatus: "none",
    keyFields: input.keyFields,
    fileUrl: input.fileUrl,
    mimeType: input.mimeType ?? null,
    fileName: input.fileName,
  };
  const next = [rec, ...read()];
  write(next);
  return rec;
};

export const removeScannedRecord = (id: string) => {
  dropCachedRecordBlob(id);
  write(read().filter((r) => r.id !== id));
};

export const subscribeToScannedRecords = (handler: () => void): (() => void) => {
  const wrapped = () => handler();
  window.addEventListener(UPDATE_EVENT, wrapped);
  window.addEventListener("storage", wrapped);
  return () => {
    window.removeEventListener(UPDATE_EVENT, wrapped);
    window.removeEventListener("storage", wrapped);
  };
};
