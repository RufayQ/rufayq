<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export const TRANSPORT_SCANS_BUCKET = "transport-scans";
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs

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

<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
export const scanOwnerPrefix = (scope: { userId?: string | null; deviceId?: string | null }) =>
  scope.userId || `device:${scope.deviceId || getDeviceId()}`;

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  if (!dataUrl.startsWith("data:")) {
    throw new ScanStorageError("Invalid scan image data URL", "invalid-data-url");
  }
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`Data URL decode failed (${response.status})`);
    }
    return await response.blob();
  } catch (error) {
    if (error instanceof ScanStorageError) throw error;
    throw new ScanStorageError("Could not decode scan image", "invalid-data-url", error);
  }
}

export async function uploadScanImages(
  scope: { userId?: string | null; deviceId?: string | null },
  ticketId: string,
  dataUrls: string[],
): Promise<string[]> {
  if (!dataUrls.length) return [];
  let resolvedUserId = scope.userId ?? null;
  if (!resolvedUserId) {
    try {
      const { data } = await supabase.auth.getUser();
      resolvedUserId = data.user?.id ?? null;
    } catch {
      /* guest/device-scoped upload */
    }
  }

  const prefix = scanOwnerPrefix({ userId: resolvedUserId, deviceId: scope.deviceId });
  const paths: string[] = [];

  for (let i = 0; i < dataUrls.length; i += 1) {
    const path = `${prefix}/${ticketId}/page-${i + 1}.png`;
    let blob: Blob;
    try {
      blob = await dataUrlToBlob(dataUrls[i]);
    } catch (error) {
      if (error instanceof ScanStorageError) throw error;
      throw new ScanStorageError("Could not decode scan image", "invalid-data-url", error);
    }

    const { error } = await (supabase as any).storage
      .from(TRANSPORT_SCANS_BUCKET)
      .upload(path, blob, { contentType: blob.type || "image/png", upsert: true });

    if (error) {
      throw new ScanStorageError("Could not upload scan image", "upload", error);
    }
    paths.push(path);
  }

  return paths;
}

export async function uploadTransportScanImages({
  ticketId,
  images,
  userId,
  deviceId,
}: {
  ticketId: string;
  images: string[];
  userId?: string | null;
  deviceId?: string | null;
}): Promise<string[]> {
  return uploadScanImages({ userId, deviceId }, ticketId, images);
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Could not read scan image"));
    reader.readAsDataURL(blob);
  });

export async function fetchScanImagesAsDataUrls(paths: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const path of paths) {
    const { data, error } = await (supabase as any).storage
      .from(TRANSPORT_SCANS_BUCKET)
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      throw new ScanStorageError("Could not sign stored scan image", "sign", error);
    }

    let blob: Blob;
    try {
      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        throw new Error(`Could not download stored scan image (${response.status})`);
      }
      blob = await response.blob();
    } catch (error) {
      throw new ScanStorageError("Could not download stored scan image", "download", error);
    }

    try {
      urls.push(await blobToDataUrl(blob));
    } catch (error) {
      throw new ScanStorageError("Could not read stored scan image", "read", error);
    }
  }
  return urls;
}

<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
export const downloadTransportScanDataUrls = fetchScanImagesAsDataUrls;
