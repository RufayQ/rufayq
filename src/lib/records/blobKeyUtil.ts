/**
 * Single source of truth for IndexedDB blob keys used by the Scanner wizard,
 * the scanned-records stores, and the record viewers.
 *
 * Why this exists: every screen that touched scanner output composed its own
 * `${id}:file` / `${id}:pdf` / `${id}:pages` strings. When callers passed in a
 * pre-suffixed key (e.g. `<uuid>:file`), downstream code appended *another*
 * suffix producing `<uuid>:file:file`, so rehydration always missed and the
 * preview screen showed "No preview image was saved". Centralising the
 * normalisation here makes that class of bug unreproducible.
 */

export const BLOB_SLOTS = ["file", "pdf", "pages"] as const;
export type BlobSlot = (typeof BLOB_SLOTS)[number];

const SLOT_SUFFIX_RE = /:(file|pdf|pages)$/;

/** Strip any trailing :file / :pdf / :pages slot from a stored key. */
export const normalizeBlobBase = (key: string | null | undefined, fallbackId?: string): string => {
  const raw = (key || fallbackId || "").toString();
  return raw.replace(SLOT_SUFFIX_RE, "");
};

/** Compose a per-slot key from a (possibly suffixed) base key. */
export const slotKey = (base: string | null | undefined, slot: BlobSlot, fallbackId?: string): string =>
  `${normalizeBlobBase(base, fallbackId)}:${slot}`;

/** Drop-in replacement for the legacy `makeBlobKey(recordId, slot)` helper. */
export const makeBlobKey = (recordId: string, slot: BlobSlot = "file"): string =>
  slotKey(recordId, slot);
