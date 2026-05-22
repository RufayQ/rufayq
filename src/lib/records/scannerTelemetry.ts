/**
 * scannerTelemetry — sanitized scanner upload telemetry.
 *
 * Calls the `log_scanner_qc_event` Postgres function. Never blocks the caller,
 * never throws, and never sends document content / OCR text / full filenames /
 * patient identifiers. Only safe shape metadata travels to QC tables.
 */

import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { estimateStorageQuota } from "@/lib/records/recordBlobDb";

export type ScannerScenario = "single" | "multi-page" | "multi-record" | "unknown";
export type ScannerStorageMode = "indexeddb" | "memory" | "metadata-only" | "unspecified";

export type ScannerStage =
  | "file_selected"
  | "indexeddb_store_started"
  | "indexeddb_store_completed"
  | "indexeddb_store_failed"
  | "review_opened"
  | "save_started"
  | "save_completed"
  | "save_failed"
  | "quota_exceeded"
  | "quota_fallback_used"
  | "finalize_failed";

export interface ScannerTelemetryInput {
  stage: ScannerStage;
  scenario?: ScannerScenario;
  storageMode?: ScannerStorageMode;
  fileCount?: number;
  totalBytes?: number;
  largestFileBytes?: number;
  /** Plain MIME family strings, e.g. ["image", "application/pdf"]. Avoid full mimes when possible. */
  mimeFamilies?: string[];
  error?: unknown;
}

const MIME_FAMILY_RE = /^([a-z0-9!#$&^_.+-]+)\//i;

const toFamily = (mime: string | null | undefined): string => {
  if (!mime) return "unknown";
  if (mime === "application/pdf") return "application/pdf";
  const m = MIME_FAMILY_RE.exec(mime);
  return (m?.[1] || "unknown").toLowerCase();
};

export const summarizeMimes = (mimes: Array<string | null | undefined>): string[] => {
  const set = new Set<string>();
  mimes.forEach((m) => set.add(toFamily(m)));
  return Array.from(set).slice(0, 8);
};

const safeErrorName = (err: unknown): string | undefined => {
  if (!err) return undefined;
  if (err instanceof Error) return err.name;
  if (typeof err === "string") return "Error";
  return "Error";
};

const safeErrorMessage = (err: unknown): string | undefined => {
  if (!err) return undefined;
  if (err instanceof Error) return err.message?.slice(0, 240);
  if (typeof err === "string") return err.slice(0, 240);
  try { return JSON.stringify(err).slice(0, 240); } catch { return undefined; }
};

/** Fire-and-forget telemetry. Never throws. */
export const logScannerEvent = (input: ScannerTelemetryInput): void => {
  // Wrap in a microtask so we never block the user flow.
  void (async () => {
    try {
      const deviceId = getDeviceId();
      const quota = await estimateStorageQuota();
      await supabase.rpc("log_scanner_qc_event", {
        _stage: input.stage,
        _scenario: input.scenario ?? "unknown",
        _storage_mode: input.storageMode ?? "unspecified",
        _file_count: input.fileCount ?? 0,
        _total_bytes: input.totalBytes ?? 0,
        _largest_file_bytes: input.largestFileBytes ?? 0,
        _mime_families: input.mimeFamilies ?? [],
        _quota_estimate_bytes: quota?.quota ?? 0,
        _platform: "web",
        _device_hash: deviceId ?? null,
        _build_version: "client-telemetry",
        _error_name: safeErrorName(input.error) ?? null,
        _error_message: safeErrorMessage(input.error) ?? null,
      });
    } catch {
      // Telemetry must never crash the upload pipeline.
    }
  })();
};

/** Derive a scenario tag from selected file count and mode. */
export const deriveScenario = (
  mode: "single" | "multi-page" | "multi-record",
  fileCount: number,
): ScannerScenario => {
  if (mode === "multi-record") return "multi-record";
  if (mode === "multi-page" || fileCount > 1) return "multi-page";
  return "single";
};
