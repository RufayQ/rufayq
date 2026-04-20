import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";

const KIND_LABEL: Record<string, string> = {
  claim_upload: "Bulk Claim Upload",
  claim_correction: "Bulk Claim Correction",
  remittance_upload: "Remittance (835) Upload",
  price_correction: "Price-list Correction",
};

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-slate-500/15 text-slate-300",
  parsing: "bg-amber-500/15 text-amber-300",
  parsed: "bg-cyan-500/15 text-cyan-300",
  applying: "bg-blue-500/15 text-blue-300",
  applied: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-rose-500/15 text-rose-300",
};

const AdminRcmBulkOps = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [nj, setNj] = useState({ kind: "claim_upload", source_filename: "", source_url: "", source_mime: "text/csv", total_rows: 0, ai_summary: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("rcm_bulk_jobs").select("*").order("created_at", { ascending: false }).limit(50);
    setJobs(data || []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!nj.source_filename.trim()) return toast.error("Filename required");
    const { error } = await (supabase as any).from("rcm_bulk_jobs").insert({ ...nj, total_rows: parseInt(String(nj.total_rows)) || 0 });
    if (error) return toast.error(error.message);
    toast.success("Bulk job queued");
    setShowNew(false);
    setNj({ kind: "claim_upload", source_filename: "", source_url: "", source_mime: "text/csv", total_rows: 0, ai_summary: "" });
    load();
  };

  const apply = async (j: any) => {
    const { error } = await (supabase as any).from("rcm_bulk_jobs").update({
      status: "applied", applied_at: new Date().toISOString(), applied_rows: j.total_rows,
    }).eq("id", j.id);
    if (error) return toast.error(error.message);
    toast.success("Job marked applied");
    load();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-100";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">RCM · Bulk Upload & Correction</h2>
          <p className="text-xs text-slate-500">Upload CSV/XML/PDF for claim batches, remittance files (835), or price-list corrections.</p>
        </div>
        <button onClick={() => setShowNew(s => !s)} className="px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5">
          <Upload size={12} /> New job
        </button>
      </div>

      {showNew && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={nj.kind} onChange={e => setNj({ ...nj, kind: e.target.value })}>
              {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className={inputCls} value={nj.source_mime} onChange={e => setNj({ ...nj, source_mime: e.target.value })}>
              <option value="text/csv">CSV</option><option value="application/xml">XML</option>
              <option value="application/pdf">PDF</option><option value="application/json">JSON</option>
            </select>
          </div>
          <input className={inputCls} placeholder="Source filename *" value={nj.source_filename} onChange={e => setNj({ ...nj, source_filename: e.target.value })} />
          <input className={inputCls} placeholder="Source URL (optional)" value={nj.source_url} onChange={e => setNj({ ...nj, source_url: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Total rows (parsed)" value={nj.total_rows} onChange={e => setNj({ ...nj, total_rows: parseInt(e.target.value) || 0 })} />
          <textarea className={inputCls} placeholder="AI summary / mapping notes" value={nj.ai_summary} onChange={e => setNj({ ...nj, ai_summary: e.target.value })} />
          <button onClick={create} className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Queue job</button>
        </div>
      )}

      <div className="space-y-2">
        {jobs.length === 0 && <p className="text-sm text-slate-500">No bulk jobs yet.</p>}
        {jobs.map(j => (
          <div key={j.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-amber-400" />
                <p className="text-sm font-semibold text-slate-200">{KIND_LABEL[j.kind] || j.kind}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[j.status] || "bg-slate-700"}`}>{j.status}</span>
              </div>
              <p className="text-[10px] text-slate-500">{new Date(j.created_at).toLocaleString()}</p>
            </div>
            <p className="text-xs text-slate-400">{j.source_filename} · {j.source_mime}</p>
            <p className="text-xs text-slate-500">Rows: {j.applied_rows}/{j.total_rows} · Failed: {j.failed_rows}</p>
            {j.ai_summary && <p className="text-[11px] text-slate-400 mt-1 italic">{j.ai_summary}</p>}
            {j.error_message && <p className="text-[11px] text-rose-300 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {j.error_message}</p>}
            {j.status !== "applied" && j.status !== "failed" && (
              <button onClick={() => apply(j)} className="mt-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1">
                <CheckCircle2 size={11} /> Mark applied
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRcmBulkOps;
