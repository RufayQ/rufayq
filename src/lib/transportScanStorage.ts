import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export const TRANSPORT_SCANS_BUCKET = "transport-scans";

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

export const downloadTransportScanDataUrls = fetchScanImagesAsDataUrls;
