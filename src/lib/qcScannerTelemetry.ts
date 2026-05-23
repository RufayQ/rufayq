import { supabase } from "@/integrations/supabase/client";

type ScannerStage =
  | "file_selected"
  | "indexeddb_store_started"
  | "indexeddb_store_completed"
  | "review_opened"
  | "save_started"
  | "save_completed"
  | "save_failed"
  | "quota_fallback_used";

type ScannerScenario = "single" | "multi-page" | "multi-record";

export const logScannerQcStage = (args: {
  stage: ScannerStage;
  scenario: ScannerScenario;
  fileCount: number;
  totalBytes: number;
  largestFileBytes: number;
  mimeFamilies: string[];
  storageMode: "indexeddb" | "memory" | "metadata-only";
  quotaEstimateBytes?: number | null;
  errorName?: string;
  errorMessage?: string;
}) => {
  queueMicrotask(() => {
    void supabase.rpc("log_scanner_qc_event", {
      _stage: args.stage,
      _scenario: args.scenario,
      _storage_mode: args.storageMode,
      _file_count: args.fileCount,
      _total_bytes: args.totalBytes,
      _largest_file_bytes: args.largestFileBytes,
      _mime_families: args.mimeFamilies,
      _quota_estimate_bytes: args.quotaEstimateBytes ?? null,
      _error_name: args.errorName ?? null,
      _error_message: args.errorMessage ?? null,
    }).then(({ error }) => {
      if (error) console.warn("[scanner-qc] telemetry failed", error.message);
    });
  });
};
