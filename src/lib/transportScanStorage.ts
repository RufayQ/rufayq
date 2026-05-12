/**
 * Helpers for persisting and re-loading the analyzed page images
 * associated with a scanned flight ticket.
 *
 * Images live in the private `transport-scans` bucket under:
 *   <auth.uid() | device:<deviceId>>/<ticketId>/page-<n>.png
 *
 * Only the matching owner (or admin) can read/write — see RLS policies on
 * `storage.objects` for bucket = 'transport-scans'.
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "transport-scans";

export interface ScanScope {
  deviceId: string;
  userId?: string | null;
}

export type ScanStorageErrorCode =
  | "upload"
  | "sign"
  | "download"
  | "read"
  | "invalid-data-url";

export class ScanStorageError extends Error {
  constructor(
    message: string,
    public code: ScanStorageErrorCode,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "ScanStorageError";
  }
}

const ownerFolder = (scope: ScanScope) =>
  scope.userId ? scope.userId : `device:${scope.deviceId}`;

const dataUrlToBlob = (dataUrl: string): Blob => {
  try {
    if (!dataUrl.startsWith("data:")) {
      const bin = atob(dataUrl);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: "image/png" });
    }
    const [header, body] = dataUrl.split(",");
    const mime = /data:(.*?);base64/.exec(header)?.[1] || "image/png";
    const bin = atob(body);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch (e) {
    throw new ScanStorageError("Invalid data URL", "invalid-data-url", e);
  }
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new ScanStorageError("FileReader failed", "read", reader.error));
    reader.readAsDataURL(blob);
  });

/**
 * Upload analyzed page images for a ticket. Returns the storage object
 * paths to persist on the ticket. Throws ScanStorageError on any failure.
 */
export async function uploadScanImages(
  scope: ScanScope,
  ticketId: string,
  dataUrls: string[],
): Promise<string[]> {
  if (!ticketId) throw new ScanStorageError("ticketId required", "upload");
  if (!Array.isArray(dataUrls) || dataUrls.length === 0) return [];
  const folder = ownerFolder(scope);
  const paths: string[] = [];
  for (let i = 0; i < dataUrls.length; i++) {
    const path = `${folder}/${ticketId}/page-${i + 1}.png`;
    let blob: Blob;
    try {
      blob = dataUrlToBlob(dataUrls[i]);
    } catch (e) {
      if (e instanceof ScanStorageError) throw e;
      throw new ScanStorageError(`Could not decode page ${i + 1}`, "invalid-data-url", e);
    }
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || "image/png",
    });
    if (error) {
      throw new ScanStorageError(
        `Upload failed for page ${i + 1}: ${error.message}`,
        "upload",
        error,
      );
    }
    paths.push(path);
  }
  return paths;
}

/**
 * Resolve signed URLs for stored scan pages and return them as base64 data
 * URLs ready to feed back into the AI extraction pipeline.
 *
 * Failure modes are typed via ScanStorageError.code:
 *   - "sign"     — could not create signed URL
 *   - "download" — fetch/HTTP/blob failure
 *   - "read"     — FileReader failure
 */
export async function fetchScanImagesAsDataUrls(
  paths: string[],
): Promise<string[]> {
  if (!Array.isArray(paths) || paths.length === 0) return [];
  const out: string[] = [];
  for (const path of paths) {
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60);
    if (signErr || !signed?.signedUrl) {
      throw new ScanStorageError(
        `Could not sign ${path}: ${signErr?.message || "no url"}`,
        "sign",
        signErr,
      );
    }
    let blob: Blob;
    try {
      const res = await fetch(signed.signedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      blob = await res.blob();
    } catch (e) {
      throw new ScanStorageError(`Download failed for ${path}`, "download", e);
    }
    out.push(await blobToDataUrl(blob));
  }
  return out;
}

/** Backward-compatible alias for older call sites. */
export const downloadTransportScanDataUrls = fetchScanImagesAsDataUrls;
