/**
 * recordBlobCache — in-memory cache for large scanned-record file payloads.
 *
 * Why this exists: the legacy `scannedRecordsStore` / `travelScannedRecordsStore`
 * persisted scanner output into `localStorage` as JSON, including the full
 * base64 `fileUrl` of each captured file (up to ~11 MB after data-URL
 * encoding). On real device WebViews that comfortably blows past the 5-10 MB
 * `localStorage` quota, especially in the multi-record batch path. The
 * resulting `QuotaExceededError` was silently swallowed by `write()` so:
 *   • the just-saved record never persisted,
 *   • the Records screen subscribed and re-read an empty / corrupted blob,
 *   • the user saw the wizard "crash" and no record afterwards.
 *
 * Fix: keep heavy file bytes in this module's in-memory `Map`, and strip
 * the data URL from anything written to `localStorage`. Records loaded
 * during the same session can still preview the file (via this cache),
 * and `localStorage` only ever holds lightweight metadata.
 */

const memory = new Map<string, string>();

/** Threshold above which we refuse to persist a data URL into localStorage. */
export const RECORD_FILE_INLINE_LIMIT = 256 * 1024; // 256 KB of base64 → ~190 KB raw

/** True for any payload we should keep out of localStorage. */
export const isHeavyDataUrl = (value: string | null | undefined): boolean => {
  if (!value) return false;
  if (!value.startsWith("data:")) return false;
  return value.length > RECORD_FILE_INLINE_LIMIT;
};

/** Cache a heavy file payload (typically a data URL) by record id. */
export const cacheRecordBlob = (id: string, url: string): void => {
  if (!id || !url) return;
  memory.set(id, url);
};

/** Look up a cached file payload. Returns undefined when missing. */
export const getCachedRecordBlob = (id: string): string | undefined =>
  memory.get(id);

/** Drop a cached payload (called on record delete). */
export const dropCachedRecordBlob = (id: string): void => {
  memory.delete(id);
};
