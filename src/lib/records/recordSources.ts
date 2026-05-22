/**
 * recordSources — single canonical reader that merges every place a user
 * record can live so the Journey "Attach from Records" picker, the Chat
 * "My Records" picker, and the Records "Apply to milestone" action all see
 * the SAME list.
 *
 * Sources merged:
 *   1. `transport_attachments` rows (signed-in OR device, deleted_at IS NULL)
 *   2. listTravelScannedRecords() — Records-side travel scans (visa, passport…)
 *   3. listScannedRecords()       — Records-side medical scans
 *   4. listLoungeMemberships()    — surfaced but linkable=false (no file)
 *
 * Dedupe contract:
 *   key = origin + (filePath || id), newest first.
 *
 * Side effects:
 *   importScanToBucket() lazily uploads a scan's bytes into the
 *   `transport-attachments` storage bucket under an idempotent path so it can
 *   be linked to a milestone or attached to chat.
 */
import { supabase } from "@/integrations/supabase/client";
import { listTravelScannedRecords, type TravelScannedRecord } from "@/lib/travelScannedRecordsStore";
import { listScannedRecords, type ScannedRecord } from "@/lib/scannedRecordsStore";
import { fetchLoungeMemberships, listLoungeMemberships, type LoungeMembership } from "@/lib/loungeMemberships";
import { storageWithDeviceHeader, withDeviceHeader } from "@/lib/supabaseDeviceScope";

export const TRANSPORT_BUCKET = "transport-attachments";
const SIGNED_URL_TTL = 60 * 60;

export type RecordOrigin = "transport" | "travel-scan" | "medical-scan" | "lounge";
export type RecordDomain = "travel" | "medical";

export const domainForOrigin = (o: RecordOrigin): RecordDomain =>
  o === "medical-scan" ? "medical" : "travel";

/** Convenience accessor — works on partial rows that pre-date the `domain` field. */
export const domainOf = (r: Pick<UnifiedRecord, "origin" | "domain">): RecordDomain =>
  r.domain ?? domainForOrigin(r.origin);

export interface UnifiedRecord {
  /** Source-prefixed stable id for React keys & dedupe (e.g. "transport:abc"). */
  id: string;
  origin: RecordOrigin;
  /** Records-domain tag — drives Travel vs Medical filtering everywhere. Optional for back-compat; use `domainOf(r)` to read. */
  domain?: RecordDomain;
  label: string;
  fileName: string;
  mimeType: string | null;
  /** Human-readable short date for list rows ("12 Apr"). */
  dateLabel: string;
  /** ISO timestamp used for sorting. */
  createdAt: string;
  sourceLabelEn: string; // Travel · Medical · Lounge
  sourceLabelAr: string;
  /** Capability flags — UI should consult these instead of switching on `origin`. */
  linkableToMilestone: boolean;
  sendableToChat: boolean;
  previewable: boolean;
  /**
   * Can this row produce signed-URL / data-URL bytes RIGHT NOW?
   * Picker UIs that want to mirror the Records screen (show every row,
   * even ones whose bytes aren't ready yet) gate their attach action on
   * this flag. Defaults to the same value as `sendableToChat` for legacy
   * call sites that don't compute it explicitly.
   */
  attachable?: boolean;
  /** Storage path inside TRANSPORT_BUCKET when the file already lives there. */
  filePath?: string;
  /** Raw local-store payload kept for import / preview fall-backs. */
  travelScan?: TravelScannedRecord;
  medicalScan?: ScannedRecord;
  lounge?: LoungeMembership;
  transport?: { keyFields?: { label: string; value: string }[] | null };
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

interface ListOpts {
  userId?: string | null;
  deviceId: string;
  /** When true, omit lounge cards (which have no file to link). */
  fileBackedOnly?: boolean;
}

/**
 * Single-flight cache. Concurrent callers (Records menu, Journey picker,
 * Chat picker, header badge) share the same in-flight promise and the same
 * resolved snapshot for `CACHE_TTL_MS`. This guarantees the Records menu
 * never sees a partially-loaded array (counts vs attachments mismatch) and
 * survives transient backend hiccups by serving the last-known snapshot.
 */
const CACHE_TTL_MS = 4000;
type CacheKey = string;
interface CacheEntry { data: UnifiedRecord[]; ts: number }
const resultCache = new Map<CacheKey, CacheEntry>();
const inflight = new Map<CacheKey, Promise<UnifiedRecord[]>>();

const cacheKeyOf = (opts: ListOpts): CacheKey =>
  `${opts.userId ?? "guest"}|${opts.deviceId}|${opts.fileBackedOnly ? 1 : 0}`;

/** Drop cached snapshots so the next read goes to source. Call after writes
 *  (new scan, attachment upload, lounge mutation, record delete). */
export const invalidateUserRecordsCache = (): void => {
  resultCache.clear();
  inflight.clear();
};

const loadAllUserRecords = async (opts: ListOpts): Promise<UnifiedRecord[]> => {
  const { userId, deviceId, fileBackedOnly } = opts;

  // 1) transport_attachments — OR(user_id, device_id) AND deleted_at IS NULL
  let q = supabase
    .from("transport_attachments")
    .select("id, label, file_name, file_path, mime_type, created_at, user_id, key_fields")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(300);
  if (userId) q = q.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
  else q = q.eq("device_id", deviceId);

  const transportRows: UnifiedRecord[] = [];
  try {
    const { data, error } = await withDeviceHeader(q, deviceId);
    if (error) console.warn("[recordSources] transport_attachments load failed", error.message);
    for (const r of ((data ?? []) as unknown as Array<{
      id: string; label: string; file_name: string; file_path: string;
      mime_type: string | null; created_at: string;
      key_fields: { label: string; value: string }[] | null;
    }>)) {
      transportRows.push({
        id: `transport:${r.id}`,
        origin: "transport",
        domain: "travel",
        label: r.label || "Document",
        fileName: r.file_name,
        mimeType: r.mime_type,
        dateLabel: formatDate(r.created_at),
        createdAt: r.created_at,
        sourceLabelEn: "Travel",
        sourceLabelAr: "سفر",
        linkableToMilestone: true,
        sendableToChat: true,
        previewable: true,
        filePath: r.file_path,
        transport: { keyFields: r.key_fields },
      });
    }
  } catch (e) {
    console.warn("[recordSources] transport_attachments threw", e);
  }

  // 2) Travel scans (localStorage) — wrapped so a corrupt store can never
  // crash the Records menu.
  let travelScans: UnifiedRecord[] = [];
  try {
    travelScans = listTravelScannedRecords().map((s) => ({
      id: `travel-scan:${s.id}`,
      origin: "travel-scan",
      domain: "travel",
      label: s.title || s.subcategory || "Travel document",
      fileName: s.fileName || `${s.title || "document"}.pdf`,
      mimeType: s.mimeType ?? null,
      dateLabel: formatDate(s.createdAt),
      createdAt: s.createdAt,
      sourceLabelEn: "Travel",
      sourceLabelAr: "سفر",
      linkableToMilestone: hasScanBytes(s),
      sendableToChat: hasScanBytes(s),
      previewable: true,
      travelScan: s,
    }));
  } catch (e) {
    console.warn("[recordSources] travel scans threw", e);
  }

  // 3) Medical scans (localStorage)
  let medicalScans: UnifiedRecord[] = [];
  try {
    medicalScans = listScannedRecords().map((s) => ({
      id: `medical-scan:${s.id}`,
      origin: "medical-scan",
      domain: "medical",
      label: s.titleEn || s.category || "Medical record",
      fileName: s.fileName || s.source || `${s.titleEn || "record"}.pdf`,
      mimeType: s.mimeType ?? null,
      dateLabel: s.date || formatDate(s.createdAt),
      createdAt: s.createdAt,
      sourceLabelEn: "Medical",
      sourceLabelAr: "طبي",
      linkableToMilestone: !!s.fileUrl,
      sendableToChat: !!s.fileUrl,
      previewable: true,
      medicalScan: s,
    }));
  } catch (e) {
    console.warn("[recordSources] medical scans threw", e);
  }

  // 4) Lounge cards — surface only when caller allows non-file rows.
  let lounges: UnifiedRecord[] = [];
  if (!fileBackedOnly) {
    await fetchLoungeMemberships().catch((e) => {
      console.warn("[recordSources] lounge memberships refresh failed", e);
    });
    try {
      lounges = listLoungeMemberships().map((l) => ({
        id: `lounge:${l.id}`,
        origin: "lounge",
        domain: "travel",
        label: l.program || "Lounge card",
        fileName: l.membershipNumber || "—",
        mimeType: null,
        dateLabel: formatDate(l.createdAt ?? null),
        createdAt: l.createdAt ?? new Date(0).toISOString(),
        sourceLabelEn: "Lounge",
        sourceLabelAr: "صالة",
        linkableToMilestone: false,
        sendableToChat: false,
        previewable: true,
        lounge: l,
      }));
    } catch (e) {
      console.warn("[recordSources] lounge listing threw", e);
    }
  }

  const merged = [...transportRows, ...travelScans, ...medicalScans, ...lounges];

  // Dedupe — prefer storage-backed rows over local scans pointing at same path.
  const seen = new Set<string>();
  const deduped: UnifiedRecord[] = [];
  for (const r of merged) {
    const key = `${r.origin}:${r.filePath ?? r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  // Stable sort: newest first, then origin tie-breaker for determinism.
  const ORIGIN_ORDER: Record<RecordOrigin, number> = { transport: 0, "travel-scan": 1, "medical-scan": 2, lounge: 3 };
  deduped.sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    if (tb !== ta) return tb - ta;
    return ORIGIN_ORDER[a.origin] - ORIGIN_ORDER[b.origin];
  });

  return deduped;
};

/**
 * Public reader. Single-flight + short-TTL cache so multiple components
 * mounting at once (Records menu counts, attachments grid, picker) share one
 * network round-trip and ALWAYS render the same snapshot.
 */
export const listAllUserRecords = async (opts: ListOpts): Promise<UnifiedRecord[]> => {
  const key = cacheKeyOf(opts);
  const cached = resultCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = (async () => {
    try {
      const data = await loadAllUserRecords(opts);
      resultCache.set(key, { data, ts: Date.now() });
      return data;
    } catch (e) {
      console.error("[recordSources] listAllUserRecords failed", e);
      // Serve last-known snapshot if we have one — keeps the menu rendering
      // consistent counts/attachments even on transient backend errors.
      if (cached) return cached.data;
      return [];
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
};


const hasScanBytes = (s: TravelScannedRecord): boolean =>
  !!(s.fileUrl || s.pdfUrl || (s.pageImages && s.pageImages.length));

/** Best-effort signed URL resolver for previews / chat handoff. */
export const resolveRecordSignedUrl = async (
  rec: UnifiedRecord,
  deviceId?: string,
): Promise<string | null> => {
  if (rec.filePath) {
    const bucket = deviceId ? storageWithDeviceHeader(TRANSPORT_BUCKET, deviceId) : supabase.storage.from(TRANSPORT_BUCKET);
    const { data } = await bucket
      .createSignedUrl(rec.filePath, SIGNED_URL_TTL);
    return data?.signedUrl ?? null;
  }
  if (rec.travelScan) {
    return rec.travelScan.fileUrl || rec.travelScan.pdfUrl || rec.travelScan.pageImages?.[0] || null;
  }
  if (rec.medicalScan) return rec.medicalScan.fileUrl ?? null;
  return null;
};

const mimeToExt = (mime: string | null | undefined, fallback = "bin"): string => {
  if (!mime) return fallback;
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return mime.split("/")[1]?.replace("jpeg", "jpg") || fallback;
  return fallback;
};

const dataUrlOrBlobUrlToBlob = async (url: string): Promise<Blob> => {
  // Works for data:, blob:, and absolute http(s):// urls alike.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch source bytes (${res.status})`);
  return await res.blob();
};

/**
 * Import a scanned record (travel-scan or medical-scan) into the
 * transport-attachments bucket so it can be linked to a milestone or sent to
 * chat. Idempotent: the storage path is derived from the record id, and we
 * upsert so repeated calls return the same path without duplicating bytes.
 *
 * Returns the storage path and resolved bytes metadata.
 */
export interface ImportedScan {
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export const importScanToBucket = async (
  rec: UnifiedRecord,
  opts: { userId?: string | null; deviceId: string },
): Promise<ImportedScan> => {
  if (rec.origin !== "travel-scan" && rec.origin !== "medical-scan") {
    throw new Error("importScanToBucket only handles scan-origin records");
  }
  let sourceUrl: string | undefined;
  let preferredMime: string | null | undefined;
  let preferredName: string | undefined;
  if (rec.travelScan) {
    sourceUrl = rec.travelScan.fileUrl || rec.travelScan.pdfUrl || rec.travelScan.pageImages?.[0];
    preferredMime = rec.travelScan.mimeType ?? (rec.travelScan.pdfUrl ? "application/pdf" : (rec.travelScan.pageImages?.length ? "image/jpeg" : null));
    preferredName = rec.travelScan.fileName;
  } else if (rec.medicalScan) {
    sourceUrl = rec.medicalScan.fileUrl;
    preferredMime = rec.medicalScan.mimeType ?? null;
    preferredName = rec.medicalScan.fileName;
  }
  if (!sourceUrl) throw new Error("No source bytes available for this record");

  const blob = await dataUrlOrBlobUrlToBlob(sourceUrl);
  const mimeType = preferredMime || blob.type || "application/octet-stream";
  const ext = mimeToExt(mimeType, preferredName?.split(".").pop() || "bin");
  const localId = rec.origin === "travel-scan" ? rec.travelScan!.id : rec.medicalScan!.id;
  const owner = opts.userId ? `user/${opts.userId}` : opts.deviceId;
  const filePath = `${owner}/scan-imports/${localId}.${ext}`;
  const fileName = preferredName || `${rec.label}.${ext}`;

  const { error } = await storageWithDeviceHeader(TRANSPORT_BUCKET, opts.deviceId)
    .upload(filePath, blob, { contentType: mimeType, upsert: true });
  if (error) throw error;

  return { filePath, fileName, mimeType, sizeBytes: blob.size };
};

/**
 * Records-domain canonical alias. Use this name from new call sites so it
 * reads as "list all records for a user" rather than the legacy
 * chat-flavoured name.
 */
export const listAllRecordsForUser = listAllUserRecords;

/**
 * Public alias kept for naming parity with the spec — same as
 * `resolveRecordSignedUrl` and resolves a previewable URL for any
 * UnifiedRecord regardless of origin.
 */
export const resolveRecordUrl = resolveRecordSignedUrl;

/**
 * Portable signed URL resolver for chat/share handoff.
 *
 * Scan-origin records (`travel-scan` / `medical-scan`) live as `blob:` URLs
 * in the sender's tab. Those URLs die on reload and are meaningless to a
 * recipient. This helper FIRST uploads the scan bytes to the shared
 * `transport-attachments` bucket (idempotent on the record id), THEN issues
 * a signed URL against the persisted file so anyone with the link — sender,
 * recipient, or a future session — can fetch it.
 *
 * For `transport`-origin rows (already in the bucket) it just delegates to
 * `resolveRecordSignedUrl`.
 */
export const resolvePortableSignedUrl = async (
  rec: UnifiedRecord,
  opts: { userId?: string | null; deviceId: string },
): Promise<string | null> => {
  if (rec.filePath) return resolveRecordSignedUrl(rec, opts.deviceId);
  if (rec.origin === "travel-scan" || rec.origin === "medical-scan") {
    try {
      const imported = await importScanToBucket(rec, opts);
      const { data } = await storageWithDeviceHeader(TRANSPORT_BUCKET, opts.deviceId)
        .createSignedUrl(imported.filePath, SIGNED_URL_TTL);
      return data?.signedUrl ?? null;
    } catch (e) {
      console.warn("[resolvePortableSignedUrl] import failed, falling back to local URL", e);
      return resolveRecordSignedUrl(rec, opts.deviceId);
    }
  }
  return resolveRecordSignedUrl(rec, opts.deviceId);
};

/**
 * Picker-flavoured reader: returns the EXACT same set of rows the Records
 * screen renders (transport attachments + travel scans + medical scans),
 * without filtering rows that lack byte-backed previews. Lounge cards are
 * excluded because they are not documents.
 *
 * Each row carries an `attachable` flag the picker uses to disable the
 * pick action for rows whose bytes aren't ready (e.g. medical scan whose
 * `fileUrl` hasn't been rehydrated from IndexedDB yet). The list itself
 * never hides those rows — parity with the Records screen is the contract.
 *
 * Bypasses the `listAllUserRecords` snapshot cache so the picker always
 * reads source-of-truth on open.
 */
export const listAllRecordsForPicker = async (
  opts: { userId?: string | null; deviceId: string },
): Promise<UnifiedRecord[]> => {
  const { userId, deviceId } = opts;

  // 1) transport_attachments — same query TravelRecordsList runs.
  let q = supabase
    .from("transport_attachments")
    .select("id, label, file_name, file_path, mime_type, created_at, user_id, key_fields")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(300);
  if (userId) q = q.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
  else q = q.eq("device_id", deviceId);

  const transportRows: UnifiedRecord[] = [];
  try {
    const { data, error } = await withDeviceHeader(q, deviceId);
    if (error) console.warn("[recordSources/picker] transport load failed", error.message);
    for (const r of ((data ?? []) as unknown as Array<{
      id: string; label: string; file_name: string; file_path: string;
      mime_type: string | null; created_at: string;
      key_fields: { label: string; value: string }[] | null;
    }>)) {
      transportRows.push({
        id: `transport:${r.id}`,
        origin: "transport",
        domain: "travel",
        label: r.label || "Document",
        fileName: r.file_name,
        mimeType: r.mime_type,
        dateLabel: formatDate(r.created_at),
        createdAt: r.created_at,
        sourceLabelEn: "Travel",
        sourceLabelAr: "سفر",
        linkableToMilestone: true,
        sendableToChat: true,
        previewable: true,
        attachable: true,
        filePath: r.file_path,
        transport: { keyFields: r.key_fields },
      });
    }
  } catch (e) {
    console.warn("[recordSources/picker] transport threw", e);
  }

  // 2) Travel scans — surface every row, mark attachable only when bytes exist.
  let travelScans: UnifiedRecord[] = [];
  try {
    travelScans = listTravelScannedRecords().map((s) => {
      const hasBytes = hasScanBytes(s);
      return {
        id: `travel-scan:${s.id}`,
        origin: "travel-scan" as const,
        domain: "travel" as const,
        label: s.title || s.subcategory || "Travel document",
        fileName: s.fileName || `${s.title || "document"}.pdf`,
        mimeType: s.mimeType ?? null,
        dateLabel: formatDate(s.createdAt),
        createdAt: s.createdAt,
        sourceLabelEn: "Travel",
        sourceLabelAr: "سفر",
        linkableToMilestone: hasBytes,
        sendableToChat: hasBytes,
        previewable: true,
        attachable: hasBytes,
        travelScan: s,
      };
    });
  } catch (e) {
    console.warn("[recordSources/picker] travel scans threw", e);
  }

  // 3) Medical scans — same contract: list everything, gate attachability.
  let medicalScans: UnifiedRecord[] = [];
  try {
    medicalScans = listScannedRecords().map((s) => {
      const hasBytes = !!s.fileUrl;
      return {
        id: `medical-scan:${s.id}`,
        origin: "medical-scan" as const,
        domain: "medical" as const,
        label: s.titleEn || s.category || "Medical record",
        fileName: s.fileName || s.source || `${s.titleEn || "record"}.pdf`,
        mimeType: s.mimeType ?? null,
        dateLabel: s.date || formatDate(s.createdAt),
        createdAt: s.createdAt,
        sourceLabelEn: "Medical",
        sourceLabelAr: "طبي",
        linkableToMilestone: hasBytes,
        sendableToChat: hasBytes,
        previewable: true,
        attachable: hasBytes,
        medicalScan: s,
      };
    });
  } catch (e) {
    console.warn("[recordSources/picker] medical scans threw", e);
  }

  const merged = [...transportRows, ...travelScans, ...medicalScans];

  // Dedupe by (origin, filePath || id) — same contract as listAllUserRecords.
  const seen = new Set<string>();
  const deduped: UnifiedRecord[] = [];
  for (const r of merged) {
    const key = `${r.origin}:${r.filePath ?? r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  const ORIGIN_ORDER: Record<RecordOrigin, number> = { transport: 0, "travel-scan": 1, "medical-scan": 2, lounge: 3 };
  deduped.sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    if (tb !== ta) return tb - ta;
    return ORIGIN_ORDER[a.origin] - ORIGIN_ORDER[b.origin];
  });

  return deduped;
};

