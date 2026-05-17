import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  PLATFORMS, RUN_RESULTS, CASE_CODES, resultTone, fmtDate, qc,
  type QcRunResult, type QcPlatform,
} from "./lib/qcShared";

interface TestRun {
  id: string;
  created_at: string;
  reporter_id: string | null;
  build_version: string;
  platform: QcPlatform;
  device: string | null;
  scenario: string;
  result: QcRunResult;
  case_code: number | null;
  case_subtags: string[];
  notes: string | null;
}

const blankForm = () => ({
  build_version: "",
  platform: "android" as QcPlatform,
  device: "",
  scenario: "",
  result: "pass" as QcRunResult,
  case_code: "" as "" | string,
  case_subtags: "",
  notes: "",
});

const AdminQcRuns = () => {
  const [rows, setRows] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<QcPlatform | "all">("all");
  const [result, setResult] = useState<QcRunResult | "all">("all");
  const [caseFilter, setCaseFilter] = useState<"all" | number>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await qc("qc_test_runs")
      .select("*").order("created_at", { ascending: false }).limit(500);
    if (error) toast.error(error.message);
    else setRows((data as TestRun[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (platform !== "all" && r.platform !== platform) return false;
      if (result !== "all" && r.result !== result) return false;
      if (caseFilter !== "all" && r.case_code !== caseFilter) return false;
      if (!q) return true;
      return [r.build_version, r.scenario, r.device, r.notes]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [rows, search, platform, result, caseFilter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.build_version.trim() || !form.scenario.trim()) {
      toast.error("Build version and scenario are required"); return;
    }
    setSaving(true);
    const payload: any = {
      build_version: form.build_version.trim(),
      platform: form.platform,
      device: form.device.trim() || null,
      scenario: form.scenario.trim(),
      result: form.result,
      case_code: form.case_code ? Number(form.case_code) : null,
      case_subtags: form.case_subtags ? form.case_subtags.split(",").map((s) => s.trim()).filter(Boolean) : [],
      notes: form.notes.trim() || null,
    };
    const { error } = await qc("qc_test_runs").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Test run logged");
    setForm(blankForm());
    setShowForm(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search build, scenario, device, notes…"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200" />
        </div>
        <select value={platform} onChange={(e) => setPlatform(e.target.value as any)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={result} onChange={(e) => setResult(e.target.value as any)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All results</option>
          {RUN_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={String(caseFilter)} onChange={(e) => setCaseFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
          <option value="all">All cases</option>
          {CASE_CODES.map((c) => <option key={c} value={c}>Case {c}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs flex items-center gap-1.5">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />Refresh
        </button>
        <button onClick={() => setShowForm((v) => !v)} className="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5">
          <Plus size={12} />New run
        </button>
        <span className="ml-auto text-[11px] text-slate-500">
          showing <span className="text-slate-300">{filtered.length}</span> of {rows.length}
        </span>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ["Build version *", "build_version", "1.4.2 (build 87)"],
            ["Device", "device", "Pixel 7 / Android 14"],
            ["Scenario *", "scenario", "Cold launch, online"],
          ].map(([label, key, ph]) => (
            <label key={key} className="text-xs text-slate-400 space-y-1">
              <span>{label}</span>
              <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={ph as string}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
            </label>
          ))}
          <label className="text-xs text-slate-400 space-y-1">
            <span>Platform *</span>
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as QcPlatform })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Result *</span>
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as QcRunResult })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
              {RUN_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Case code (1–6, optional)</span>
            <select value={form.case_code} onChange={(e) => setForm({ ...form, case_code: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
              <option value="">—</option>
              {CASE_CODES.map((c) => <option key={c} value={c}>Case {c}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-400 space-y-1">
            <span>Case sub-tags (comma-separated)</span>
            <input value={form.case_subtags} onChange={(e) => setForm({ ...form, case_subtags: e.target.value })}
              placeholder="FIREBASE_INIT_FAIL, RENDERED_BLANK"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
          </label>
          <label className="text-xs text-slate-400 space-y-1 md:col-span-2">
            <span>Notes</span>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold disabled:opacity-60">
              {saving ? "Saving…" : "Save run"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              {["Date","Build","Platform","Device","Scenario","Result","Case","Sub-tags"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={8} className="text-center text-slate-500 py-8">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-slate-500 py-8">No runs.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                <td className="px-3 py-2 font-mono text-amber-400">{r.build_version}</td>
                <td className="px-3 py-2 text-slate-300">{r.platform}</td>
                <td className="px-3 py-2 text-slate-400">{r.device || "—"}</td>
                <td className="px-3 py-2 text-slate-200">{r.scenario}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] border ${resultTone[r.result]}`}>{r.result}</span>
                </td>
                <td className="px-3 py-2 text-slate-300">{r.case_code ? `Case ${r.case_code}` : "—"}</td>
                <td className="px-3 py-2 text-slate-500">{r.case_subtags?.length ? r.case_subtags.join(", ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminQcRuns;
