const DB_NAME = "rufayq_scanner_files";
const DB_VERSION = 1;
const STORE = "blobs";

export type ScannerStoredBlobRef = {
  key: string;
  mimeType: string | null;
  fileName: string;
  size: number;
};

const openDb = async (): Promise<IDBDatabase> => await new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error("indexeddb_open_failed"));
});

const txDone = async (tx: IDBTransaction) => await new Promise<void>((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error ?? new Error("indexeddb_tx_failed"));
  tx.onabort = () => reject(tx.error ?? new Error("indexeddb_tx_aborted"));
});

export const scannerStoreAvailable = (): boolean => typeof indexedDB !== "undefined";

export const putScannerBlob = async (file: Blob, meta: { fileName: string; mimeType?: string | null }): Promise<ScannerStoredBlobRef> => {
  const db = await openDb();
  const key = (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `scanner-${Date.now()}`;
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(file, key);
  await txDone(tx);
  db.close();
  return { key, fileName: meta.fileName, mimeType: meta.mimeType ?? file.type ?? null, size: file.size };
};

export const getScannerBlob = async (key: string): Promise<Blob | null> => {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).get(key);
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error ?? new Error("indexeddb_get_failed"));
  });
  await txDone(tx);
  db.close();
  return blob;
};
