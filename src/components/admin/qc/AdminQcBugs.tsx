import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search, X, Bug } from "lucide-react";
import { toast } from "sonner";
import {
  PLATFORMS, BUG_SEVERITIES, BUG_STATUSES, CASE_CODES,
  severityTone, statusTone, fmtDate, qc,
  type QcPlatform, type QcBugSeverity, type QcBugStatus,
} from "./lib/qcShared";

interface Bug {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string;
  severity: QcBugSeverity;
  status: QcBugStatus;
  platform: QcPlatform | null;
  build_version: string | null;
  case_code: number | null;
  case_subtags: string[];
  source: string;
  reporter_id: string | null;
  assignee_id: string | null;
  test_run_id: string | null;
  crash_event_id: string | null;
  screenshot_paths: string[];
}

const blank = () => ({
  title: "", description: "",
  severity: "major" as QcBugSeverity,
  status: "open" as QcBugStatus,
  platform: "android" as QcPlatform,
  build_version: "",
  case_code: "" as "" | string,
});

const AdminQcBugs = () => {
  const [rows, setRows] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<QcBugStatus | "all">("all");
  const [sevF, setSevF] = useState<QcBugSeverity | "all">("all");
  const [platformF, setPlatformF] = useState<QcPlatform | "all">("all");
  const [caseF, setCaseF] = useState<"all" | number>("all");
  const [sourceF, setSourceF] = useState<"all" | "manual" | "smoke_report" | "system_crash">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [activeBug, setActiveBug] = useState<Bug | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await qc("qc_bugs").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) toast.error(error.message);
    else setRows((data as Bug[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusF !== "all" && r.status !== statusF) return false;
      if (sevF !== "all" && r.severity !== sevF) return false;
      if (platformF !== "all" && r.platform !== platformF) return false;
      if (caseF !== "all" && r.case_code !== caseF) return false;
      if (sourceF !== "all" && r.source !== sourceF) return false;
      if (!q) return true;
      return [r.title, r.description, r.build_version].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [rows, search, statusF, sevF, platformF, caseF, sourceF]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required"); return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.severity,
      status: form.status,
      platform: form.platform,
      build_version: form.build_version.trim() || null,
      case_code: form.case_code ? Number(form.case_code) : null,
      source: "manual",
    };
    const { error } = await qc("qc_bugs").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bug filed");
    setForm(blank()); setShowForm(false); load();
  };

  const updateBug = async (id: string, patch: Partial<Bug>) => {
    const { error } = await qc("qc_bugs").update(patch as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } as Bug : r)));
    if (activeBug?.id === id) setActiveBug({ ...activeBug, ...patch } as Bug);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, description, build…"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200" />
        </div>
        {[
          ["Status", statusF, setStatusF, ["all", ...BUG_STATUSES]],
          ["Severity", sevF, setSevF, ["all", ...BUG_SEVERITIES]],
          ["Platform", platformF, setPlatformF, ["all", ...PLATFORMS]],
          ["Source", sourceF, setSourceF, ["all", "manual", "smoke_report", "system_crash"]],
        ].map(([label, val, set, opts]: any) => (
          <select key={label} value={val} onChange={(e) => set(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
            {opts.map((o: string) => <option key={o} value={o}>{o === "all" ? `All ${label.toLowerCase()}` : o}</option>)}
          </select>
        ))}
        <select value={String(caseF)} onChange={(e) => setCaseF(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All cases</option>
          {CASE_CODES.map((c) => <option key={c} value={c}>Case {c}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1.5">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />Refresh
        </button>
        <button onClick={() => setShowForm((v) => !v)} className="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5">
          <Plus size={12} />New bug
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-slate-400 space-y-1 md:col-span-2">
            <span>Title *</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
          </label>
          <label className="text-xs text-slate-400 space-y-1 md:col-span-2">
            <span>Description (markdown) *</span>
            <textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono" />
          </label>
          {[
            ["Severity", "severity", BUG_SEVERITIES],
            ["Status", "status", BUG_STATUSES],
            ["Platform", "platform", PLATFORMS],
          ].map(([label, key, opts]: any) => (
            <label key={key} className="text-xs text-slate-400 space-y-1">
              <span>{label}</span>
              <select value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
                {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          ))}
          <label className="text-xs text-slate-400 space-y-1">
            <span>Build version</span>
            <input value={form.build_version} onChange={(e) => setForm({ ...form, build_version: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Case code</span>
            <select value={form.case_code} onChange={(e) => setForm({ ...form, case_code: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
              <option value="">—</option>
              {CASE_CODES.map((c) => <option key={c} value={c}>Case {c}</option>)}
            </select>
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold disabled:opacity-60">
              {saving ? "Saving…" : "File bug"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {loading && rows.length === 0 && <p className="text-slate-400 text-sm">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-slate-500 text-sm py-8 text-center border border-dashed border-slate-800 rounded-xl">No bugs match.</p>
        )}
        {filtered.map((b) => (
          <button key={b.id} onClick={() => setActiveBug(b)}
            className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/50 hover:border-amber-500/40 transition p-4">
            <div className="flex items-start gap-2 mb-1.5">
              <Bug size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-100 flex-1 truncate">{b.title}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${severityTone[b.severity]}`}>{b.severity}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusTone[b.status]}`}>{b.status}</span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">{b.description}</p>
            <p className="text-[10px] text-slate-500 mt-1.5">
              {fmtDate(b.created_at)} · {b.platform || "—"} · {b.build_version || "no build"}
              {b.case_code && ` · Case ${b.case_code}`}
              {b.case_subtags?.length ? ` · ${b.case_subtags.join(", ")}` : ""}
              {b.source !== "manual" && ` · ${b.source}`}
            </p>
          </button>
        ))}
      </div>

      {activeBug && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setActiveBug(null)}>
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl bg-slate-950 border-l border-slate-800 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-950 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100 truncate flex-1">{activeBug.title}</h2>
              <button onClick={() => setActiveBug(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <select value={activeBug.severity} onChange={(e) => updateBug(activeBug.id, { severity: e.target.value as QcBugSeverity })}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
                  {BUG_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={activeBug.status} onChange={(e) => updateBug(activeBug.id, { status: e.target.value as QcBugStatus })}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
                  {BUG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <pre className="whitespace-pre-wrap text-xs text-slate-200 bg-slate-900/60 border border-slate-800 rounded-lg p-3 font-mono">
                {activeBug.description}
              </pre>
              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>Filed: {fmtDate(activeBug.created_at)} · Updated: {fmtDate(activeBug.updated_at)}</p>
                <p>Platform: {activeBug.platform || "—"} · Build: {activeBug.build_version || "—"}</p>
                <p>Case: {activeBug.case_code ? `Case ${activeBug.case_code}` : "—"}{activeBug.case_subtags?.length ? ` [+${activeBug.case_subtags.join(", +")}]` : ""}</p>
                <p>Source: {activeBug.source}{activeBug.test_run_id && ` · linked to test run ${activeBug.test_run_id.slice(0, 8)}`}{activeBug.crash_event_id && ` · linked to crash ${activeBug.crash_event_id.slice(0, 8)}`}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQcBugs;
