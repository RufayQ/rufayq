/**
 * recordBlobDb — IndexedDB-backed durable storage for scanner file blobs.
 *
 * Why: localStorage cannot hold large scanned PDFs / images (5–10 MB cap is
 * blown by a single high-res phone photo). The legacy approach base64-inlined
 * up to 8 MB per record into localStorage which both crashed the wizard
 * (QuotaExceededError) AND lost previews after refresh. This module persists
 * the original Blob bytes in IndexedDB so:
 *   • localStorage only holds lightweight metadata (blob key, mime, size),
 *   • the Records preview survives a full reload,
 *   • Android WebViews never serialize multi-megabyte strings.
 *
 * Public API is intentionally async and tolerant — every operation can fall
 * back to the in-memory cache when IndexedDB is unavailable (private mode,
 * old WebView, disk quota).
 */

import {
  cacheRecordBlob,
  dropCachedRecordBlob,
  getCachedRecordBlob,
} from "@/lib/records/recordBlobCache";

const DB_NAME = "rufayq_record_blobs";
const DB_VERSION = 1;
const STORE = "blobs";

type StorageMode = "indexeddb" | "memory" | "metadata-only";

let openPromise: Promise<IDBDatabase> | null = null;

const hasIndexedDB = (): boolean =>
  typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

const openDb = (): Promise<IDBDatabase> => {
  if (!hasIndexedDB()) return Promise.reject(new Error("indexeddb-unavailable"));
  if (openPromise) return openPromise;
  openPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      openPromise = null;
      reject(req.error || new Error("indexeddb-open-failed"));
    };
  });
  return openPromise;
};

const runTx = async <T,>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result: T | undefined;
    Promise.resolve(fn(store))
      .then((req) => {
        if (req && typeof (req as IDBRequest).onsuccess !== "undefined") {
          const r = req as IDBRequest<T>;
          r.onsuccess = () => { result = r.result; };
          r.onerror = () => reject(r.error);
        } else {
          result = req as T;
        }
      })
      .catch(reject);
    tx.oncomplete = () => resolve(result as T);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("indexeddb-tx-aborted"));
  });
};

export interface StoredBlobMeta {
  key: string;
  size: number;
  mimeType: string | null;
  storageMode: StorageMode;
}

/** Persist a Blob/File and return its lightweight metadata reference. */
export const putRecordBlob = async (
  key: string,
  blob: Blob,
): Promise<StoredBlobMeta> => {
  const size = blob.size;
  const mimeType = blob.type || null;
  if (!hasIndexedDB()) {
    // Last-resort: hold an object URL in memory cache so the current session
    // still previews. Survives until tab close.
    try {
      const url = URL.createObjectURL(blob);
      cacheRecordBlob(key, url);
      return { key, size, mimeType, storageMode: "memory" };
    } catch {
      return { key, size, mimeType, storageMode: "metadata-only" };
    }
  }
  try {
    await runTx("readwrite", (store) => store.put(blob, key));
    // Also seed the session cache for instant previews without re-reading IDB.
    try {
      const url = URL.createObjectURL(blob);
      cacheRecordBlob(key, url);
    } catch { /* noop */ }
    return { key, size, mimeType, storageMode: "indexeddb" };
  } catch {
    try {
      const url = URL.createObjectURL(blob);
      cacheRecordBlob(key, url);
      return { key, size, mimeType, storageMode: "memory" };
    } catch {
      return { key, size, mimeType, storageMode: "metadata-only" };
    }
  }
};

/** Read a Blob back from IndexedDB. Returns null when missing or unavailable. */
export const getRecordBlob = async (key: string): Promise<Blob | null> => {
  if (!hasIndexedDB()) return null;
  try {
    const value = await runTx<Blob | undefined>("readonly", (store) => store.get(key) as IDBRequest<Blob | undefined>);
    return (value as Blob | undefined) ?? null;
  } catch {
    return null;
  }
};

/**
 * Resolve a previewable URL for a stored blob. Uses the in-memory cache when
 * present (fast path) and falls back to a fresh object URL from IndexedDB.
 * Returns null when neither source has the blob.
 */
export const resolveRecordBlobUrl = async (key: string): Promise<string | null> => {
  const cached = getCachedRecordBlob(key);
  if (cached) return cached;
  const blob = await getRecordBlob(key);
  if (!blob) return null;
  try {
    const url = URL.createObjectURL(blob);
    cacheRecordBlob(key, url);
    return url;
  } catch {
    return null;
  }
};

export const deleteRecordBlob = async (key: string): Promise<void> => {
  dropCachedRecordBlob(key);
  if (!hasIndexedDB()) return;
  try {
    await runTx("readwrite", (store) => store.delete(key));
  } catch { /* noop */ }
};

/** Approximate IndexedDB / quota usage when the browser supports it. */
export const estimateStorageQuota = async (): Promise<{
  usage: number;
  quota: number;
} | null> => {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { usage, quota };
    }
  } catch { /* noop */ }
  return null;
};

/** Generate a stable blob key for a record id + slot (e.g. "file", "pdf"). */
export const makeBlobKey = (recordId: string, slot: string = "file"): string =>
  `${recordId}:${slot}`;
