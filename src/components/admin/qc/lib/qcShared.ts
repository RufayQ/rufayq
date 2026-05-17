// Shared utilities for QC admin screens.
import { supabase } from "@/integrations/supabase/client";

export const PLATFORMS = ["web", "ios", "android"] as const;
export type QcPlatform = (typeof PLATFORMS)[number];

export const RUN_RESULTS = ["pass", "fail", "blocked", "skipped"] as const;
export type QcRunResult = (typeof RUN_RESULTS)[number];

export const BUG_SEVERITIES = ["blocker", "critical", "major", "minor", "trivial"] as const;
export type QcBugSeverity = (typeof BUG_SEVERITIES)[number];

export const BUG_STATUSES = ["open", "in_progress", "fixed", "validated", "closed", "wont_fix"] as const;
export type QcBugStatus = (typeof BUG_STATUSES)[number];

export const CRASH_STATUSES = ["new", "triaged", "linked_to_bug", "ignored"] as const;
export type QcCrashStatus = (typeof CRASH_STATUSES)[number];

export const CASE_CODES = [1, 2, 3, 4, 5, 6] as const;

export const severityTone: Record<QcBugSeverity, string> = {
  blocker:  "bg-red-500/15    text-red-300    border-red-500/30",
  critical: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  major:    "bg-amber-500/15  text-amber-300  border-amber-500/30",
  minor:    "bg-blue-500/15   text-blue-300   border-blue-500/30",
  trivial:  "bg-slate-700/40  text-slate-400  border-slate-700",
};

export const statusTone: Record<QcBugStatus, string> = {
  open:        "bg-amber-500/15   text-amber-300   border-amber-500/30",
  in_progress: "bg-blue-500/15    text-blue-300    border-blue-500/30",
  fixed:       "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  validated:   "bg-emerald-600/25 text-emerald-200 border-emerald-500/40",
  closed:      "bg-slate-700/40   text-slate-400   border-slate-700",
  wont_fix:    "bg-slate-800      text-slate-500   border-slate-700",
};

export const resultTone: Record<QcRunResult, string> = {
  pass:    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  fail:    "bg-red-500/15     text-red-300     border-red-500/30",
  blocked: "bg-amber-500/15   text-amber-300   border-amber-500/30",
  skipped: "bg-slate-700/40   text-slate-400   border-slate-700",
};

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString() : "—";

export const QC_TABLE = {
  runs: "qc_test_runs",
  bugs: "qc_bugs",
  validations: "qc_bug_validations",
  crashes: "qc_crash_events",
} as const;

// Helper: typed wrapper that silences the generated-types union noise — QC
// tables exist in the migration but the generated supabase types snapshot may
// not include them on the very first build. Cast at the boundary, not inside
// every screen.
export const qc = (table: string) => (supabase as any).from(table);
