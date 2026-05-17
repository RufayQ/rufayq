import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertCircle, HelpCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, qc, statusTone, type QcBugStatus } from "./lib/qcShared";

interface Bug {
  id: string;
  title: string;
  status: QcBugStatus;
  build_version: string | null;
  platform: string | null;
  case_code: number | null;
  updated_at: string;
}

interface Validation {
  id: string;
  bug_id: string;
  validator_id: string | null;
  build_version: string;
  outcome: "validated" | "still_broken" | "cannot_reproduce";
  notes: string | null;
  created_at: string;
}

const outcomeIcon = (o: Validation["outcome"]) =>
  o === "validated" ? <CheckCircle2 size={14} className="text-emerald-400" /> :
  o === "still_broken" ? <AlertCircle size={14} className="text-red-400" /> :
  <HelpCircle size={14} className="text-slate-400" />;

const AdminQcValidations = () => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [vals, setVals] = useState<Validation[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [form, setForm] = useState({ build_version: "", outcome: "validated" as Validation["outcome"], notes: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [b, v] = await Promise.all([
      qc("qc_bugs").select("id,title,status,build_version,platform,case_code,updated_at")
        .in("status", ["open", "in_progress", "fixed"]).order("updated_at", { ascending: false }),
      qc("qc_bug_validations").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    if (b.error) toast.error(b.error.message); else setBugs((b.data as Bug[]) ?? []);
    if (v.error) toast.error(v.error.message); else setVals((v.data as Validation[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const activeBug = bugs.find((b) => b.id === active) ?? null;
  const activeVals = useMemo(() => vals.filter((v) => v.bug_id === active), [vals, active]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!form.build_version.trim()) { toast.error("Build version is required"); return; }
    setSaving(true);
    const { error } = await qc("qc_bug_validations").insert({
      bug_id: active,
      build_version: form.build_version.trim(),
      outcome: form.outcome,
      notes: form.notes.trim() || null,
    } as any);
    if (error) { setSaving(false); toast.error(error.message); return; }

    const nextStatus: QcBugStatus | null =
      form.outcome === "validated" ? "validated" :
      form.outcome === "still_broken" ? "in_progress" : null;
    if (nextStatus) {
      const { error: uerr } = await qc("qc_bugs").update({ status: nextStatus } as any).eq("id", active);
      if (uerr) toast.error(uerr.message);
    }
    setSaving(false);
    toast.success("Validation recorded");
    setForm({ build_version: "", outcome: "validated", notes: "" });
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wide text-slate-500">Open / in-progress / fixed</h3>
          <button onClick={load} className="text-slate-500 hover:text-slate-200">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {bugs.length === 0 && <p className="text-xs text-slate-500">No bugs awaiting validation.</p>}
          {bugs.map((b) => (
            <button key={b.id} onClick={() => setActive(b.id)}
              className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                active === b.id ? "border-amber-500/50 bg-amber-500/5" : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}>
              <p className="text-xs font-semibold text-slate-100 truncate">{b.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                <span className={`inline-block px-1.5 py-0.5 rounded border ${statusTone[b.status]}`}>{b.status}</span>
                {" · "}{b.build_version || "no build"}{b.case_code && ` · Case ${b.case_code}`}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {!activeBug && <p className="text-sm text-slate-500 p-6 border border-dashed border-slate-800 rounded-xl text-center">Pick a bug to log a fix validation.</p>}
        {activeBug && (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-sm font-semibold text-slate-100">{activeBug.title}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Status: <span className={`px-1.5 py-0.5 rounded border ${statusTone[activeBug.status]}`}>{activeBug.status}</span>
                {" · "}Updated {fmtDate(activeBug.updated_at)}
              </p>
            </div>

            <form onSubmit={submit} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Log validation attempt</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input value={form.build_version} onChange={(e) => setForm({ ...form, build_version: e.target.value })}
                  placeholder="Build version *" className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
                <select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value as Validation["outcome"] })}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200">
                  <option value="validated">Validated</option>
                  <option value="still_broken">Still broken</option>
                  <option value="cannot_reproduce">Cannot reproduce</option>
                </select>
                <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold disabled:opacity-60">
                  {saving ? "Saving…" : "Record"}
                </button>
              </div>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notes (optional)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
            </form>

            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wide text-slate-500">Timeline</h4>
              {activeVals.length === 0 && <p className="text-xs text-slate-500">No validations yet.</p>}
              {activeVals.map((v) => (
                <div key={v.id} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <div className="mt-0.5">{outcomeIcon(v.outcome)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200">
                      <span className="font-semibold">{v.outcome.replace("_", " ")}</span>
                      {" · "}<span className="text-amber-400 font-mono">{v.build_version}</span>
                    </p>
                    {v.notes && <p className="text-xs text-slate-400 mt-0.5 whitespace-pre-wrap">{v.notes}</p>}
                    <p className="text-[10px] text-slate-500 mt-1">{fmtDate(v.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminQcValidations;
