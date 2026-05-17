import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Bug, X, EyeOff, Check } from "lucide-react";
import { toast } from "sonner";
import {
  CRASH_STATUSES, CASE_CODES, PLATFORMS, fmtDate, qc,
  type QcCrashStatus, type QcPlatform,
} from "./lib/qcShared";
import { suggestedSeverityForCase } from "./lib/parseSmokeReport";

interface CrashEvent {
  id: string;
  created_at: string;
  source: string;
  platform: QcPlatform | null;
  build_version: string | null;
  device: string | null;
  case_code: number | null;
  case_subtags: string[];
  error_name: string | null;
  error_message: string | null;
  stack: string | null;
  log_excerpt: string | null;
  metadata: Record<string, unknown>;
  status: QcCrashStatus;
  linked_bug_id: string | null;
}

const statusTone: Record<QcCrashStatus, string> = {
  new:            "bg-amber-500/15   text-amber-300   border-amber-500/30",
  triaged:        "bg-blue-500/15    text-blue-300    border-blue-500/30",
  linked_to_bug:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ignored:        "bg-slate-700/40   text-slate-400   border-slate-700",
};

const AdminQcCrashEvents = () => {
  const [rows, setRows] = useState<CrashEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusF, setStatusF] = useState<QcCrashStatus | "all">("all");
  const [caseF, setCaseF] = useState<"all" | number>("all");
  const [platformF, setPlatformF] = useState<QcPlatform | "all">("all");
  const [active, setActive] = useState<CrashEvent | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await qc("qc_crash_events").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) toast.error(error.message);
    else setRows((data as CrashEvent[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusF !== "all" && r.status !== statusF) return false;
    if (caseF !== "all" && r.case_code !== caseF) return false;
    if (platformF !== "all" && r.platform !== platformF) return false;
    return true;
  }), [rows, statusF, caseF, platformF]);

  const patch = async (id: string, p: Partial<CrashEvent>) => {
    const { error } = await qc("qc_crash_events").update(p as any).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } as CrashEvent : r)));
    if (active?.id === id) setActive({ ...active, ...p } as CrashEvent);
    return true;
  };

  const createBugFromEvent = async (ev: CrashEvent) => {
    setBusy(true);
    const title = `${ev.case_code ? `Case ${ev.case_code}` : "Crash"}: ${ev.error_name || ev.error_message || ev.source}`.slice(0, 200);
    const description = [
      `**Source:** ${ev.source}`,
      `**Platform:** ${ev.platform || "—"} · **Build:** ${ev.build_version || "—"} · **Device:** ${ev.device || "—"}`,
      ev.case_code ? `**Case:** ${ev.case_code}${ev.case_subtags.length ? ` [+${ev.case_subtags.join(", +")}]` : ""}` : "",
      "",
      ev.error_name && `**Error:** ${ev.error_name}`,
      ev.error_message && `> ${ev.error_message}`,
      ev.stack && ["", "## Stack", "```", ev.stack, "```"].join("\n"),
      ev.log_excerpt && ["", "## Log excerpt", "```log", ev.log_excerpt, "```"].join("\n"),
    ].filter(Boolean).join("\n");

    const { data, error } = await qc("qc_bugs").insert({
      title, description,
      source: "system_crash",
      severity: suggestedSeverityForCase(ev.case_code),
      status: "open",
      platform: ev.platform,
      build_version: ev.build_version,
      case_code: ev.case_code,
      case_subtags: ev.case_subtags,
      crash_event_id: ev.id,
    } as any).select("id").single();

    if (error || !data) { setBusy(false); toast.error(error?.message || "Failed"); return; }
    await patch(ev.id, { status: "linked_to_bug", linked_bug_id: (data as any).id });
    setBusy(false);
    toast.success("Bug created from crash event");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={statusF} onChange={(e) => setStatusF(e.target.value as any)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All statuses</option>
          {CRASH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={platformF} onChange={(e) => setPlatformF(e.target.value as any)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={String(caseF)} onChange={(e) => setCaseF(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All cases</option>
          {CASE_CODES.map((c) => <option key={c} value={c}>Case {c}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1.5">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />Refresh
        </button>
        <p className="ml-auto text-[11px] text-slate-500">
          Automated events are written by the service layer (smoke uploads, error boundaries, edge functions).
        </p>
      </div>

      <div className="space-y-2">
        {loading && rows.length === 0 && <p className="text-slate-400 text-sm">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-slate-500 text-sm py-8 text-center border border-dashed border-slate-800 rounded-xl">No crash events.</p>
        )}
        {filtered.map((ev) => (
          <button key={ev.id} onClick={() => setActive(ev)}
            className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/50 hover:border-amber-500/40 p-4">
            <div className="flex items-start gap-2 mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusTone[ev.status]}`}>{ev.status}</span>
              <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">{ev.source}</span>
              {ev.case_code && <span className="text-[10px] text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10">Case {ev.case_code}</span>}
              <span className="ml-auto text-[10px] text-slate-500">{fmtDate(ev.created_at)}</span>
            </div>
            <p className="text-sm text-slate-100 truncate">{ev.error_name || ev.error_message || "(no message)"}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{ev.platform || "?"} · {ev.build_version || "?"} · {ev.device || "?"}</p>
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setActive(null)}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl bg-slate-950 border-l border-slate-800 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-950 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100 truncate flex-1">{active.error_name || active.source}</h2>
              <button onClick={() => setActive(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 text-xs text-slate-300">
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => createBugFromEvent(active)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
                  <Bug size={12} />Create bug from event
                </button>
                <button disabled={busy} onClick={() => patch(active.id, { status: "triaged" })}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-200 text-xs flex items-center gap-1.5">
                  <Check size={12} />Mark triaged
                </button>
                <button disabled={busy} onClick={() => patch(active.id, { status: "ignored" })}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5">
                  <EyeOff size={12} />Ignore
                </button>
              </div>
              {active.error_message && <p className="text-slate-200">{active.error_message}</p>}
              {active.stack && <pre className="whitespace-pre-wrap font-mono bg-slate-900/60 border border-slate-800 rounded p-3 max-h-64 overflow-auto">{active.stack}</pre>}
              {active.log_excerpt && (
                <details>
                  <summary className="cursor-pointer text-slate-400">Log excerpt</summary>
                  <pre className="whitespace-pre-wrap font-mono bg-slate-900/60 border border-slate-800 rounded p-3 max-h-64 overflow-auto mt-2">{active.log_excerpt}</pre>
                </details>
              )}
              <details>
                <summary className="cursor-pointer text-slate-400">Metadata</summary>
                <pre className="whitespace-pre-wrap font-mono bg-slate-900/60 border border-slate-800 rounded p-3 mt-2">{JSON.stringify(active.metadata, null, 2)}</pre>
              </details>
              <p className="text-[10px] text-slate-500">
                {active.linked_bug_id ? `Linked to bug ${active.linked_bug_id.slice(0, 8)}` : "No linked bug"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQcCrashEvents;
