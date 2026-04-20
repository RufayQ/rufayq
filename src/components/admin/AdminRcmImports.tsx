import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText, Sparkles, CheckCircle2 } from "lucide-react";

const KINDS = ["contract","policy","price_list","package","class","network","tariff"];

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-slate-500/15 text-slate-300",
  parsing: "bg-blue-500/15 text-blue-300",
  ready_for_review: "bg-amber-500/15 text-amber-300",
  mapped: "bg-violet-500/15 text-violet-300",
  applied: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-rose-500/15 text-rose-300",
};

const AdminRcmImports = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<any>({ kind: "price_list", source_filename: "", source_url: "", source_mime: "" });
  const [selected, setSelected] = useState<any | null>(null);
  const [mappings, setMappings] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("rcm_import_jobs").select("*").order("created_at", { ascending: false }).limit(50);
    setJobs(data || []); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.source_filename) return toast.error("Filename required");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("rcm_import_jobs").insert({ ...form, status: "uploaded", created_by: u.user?.id });
    if (error) return toast.error(error.message);
    toast.success("Job queued — AI parsing will pick it up");
    setShowNew(false); setForm({ kind: "price_list", source_filename: "", source_url: "", source_mime: "" });
    load();
  };

  const open = async (j: any) => {
    setSelected(j);
    const { data } = await (supabase as any).from("rcm_import_mappings").select("*").eq("job_id", j.id).order("created_at");
    setMappings(data || []);
  };

  const markStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "applied") { patch.applied_at = new Date().toISOString(); }
    const { error } = await (supabase as any).from("rcm_import_jobs").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status); load();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-100";

  return (
    <div className="grid md:grid-cols-[360px_1fr] gap-4">
      <aside className="rounded-xl p-3 bg-slate-900/40 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Smart imports ({jobs.length})</h3>
          <button onClick={() => setShowNew(s => !s)} className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1"><Upload size={12} /> New</button>
        </div>

        {showNew && (
          <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 mb-3">
            <select className={inputCls} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
              {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <input className={inputCls} placeholder="Filename (e.g. bupa_pricelist_2026.csv)" value={form.source_filename} onChange={e => setForm({ ...form, source_filename: e.target.value })} />
            <input className={inputCls} placeholder="Source URL (optional)" value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} />
            <input className={inputCls} placeholder="MIME (text/csv, application/pdf, application/xml)" value={form.source_mime} onChange={e => setForm({ ...form, source_mime: e.target.value })} />
            <button onClick={create} className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Queue job</button>
            <p className="text-[10px] text-slate-500">AI parsing & mapping pipeline runs server-side; status will move to <em>ready_for_review</em>.</p>
          </div>
        )}

        {loading ? <p className="text-xs text-slate-500">Loading…</p>
          : jobs.length === 0 ? <p className="text-xs text-slate-500">No jobs yet.</p>
          : <div className="space-y-1.5">
              {jobs.map(j => (
                <button key={j.id} onClick={() => open(j)}
                  className={`w-full text-left p-2.5 rounded-lg border ${selected?.id === j.id ? "border-amber-500/50 bg-amber-500/5" : "border-slate-800"}`}>
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-slate-200 truncate">{j.source_filename}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[j.status]}`}>{j.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{j.kind} · {new Date(j.created_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>}
      </aside>

      <section className="rounded-xl p-4 bg-slate-900/40 border border-slate-800 min-h-[400px]">
        {!selected ? <p className="text-sm text-slate-500">Select a job to view AI-extracted mappings.</p>
          : <>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-100 flex items-center gap-2"><FileText size={16} /> {selected.source_filename}</p>
                <p className="text-xs text-slate-500">{selected.kind} · {selected.source_mime || "—"}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => markStatus(selected.id, "ready_for_review")} className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs flex items-center gap-1"><Sparkles size={12} /> Mark parsed</button>
                <button onClick={() => markStatus(selected.id, "applied")} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Apply</button>
              </div>
            </div>

            {selected.ai_summary && <p className="text-xs text-slate-400 mb-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">{selected.ai_summary}</p>}

            <h4 className="text-xs font-semibold text-slate-300 mb-2">Proposed mappings ({mappings.length})</h4>
            {mappings.length === 0 ? <p className="text-xs text-slate-500">No mappings yet — AI will populate after parsing.</p>
              : <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {mappings.map(m => (
                    <div key={m.id} className="text-xs p-2 rounded border border-slate-800 bg-slate-900/40">
                      <div className="flex justify-between">
                        <span className="text-slate-300">→ {m.target_table}</span>
                        <span className="text-slate-500">conf {m.confidence ?? "—"}%</span>
                      </div>
                      <pre className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap">{JSON.stringify(m.proposed || m.raw_row, null, 2).slice(0,200)}</pre>
                    </div>
                  ))}
                </div>}
          </>}
      </section>
    </div>
  );
};

export default AdminRcmImports;
