import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, Plus, ShieldCheck, ShieldAlert } from "lucide-react";

interface Props { organizationId: string; }

const RcmEligibilityWorklist = ({ organizationId }: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({ status: "pending", exception_type: "none" });

  const load = async () => {
    const [{ data: el }, { data: p }] = await Promise.all([
      (supabase as any).from("rcm_eligibility_checks").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
      (supabase as any).from("rcm_payers").select("id, name").order("name"),
    ]);
    setRows(el || []); setPayers(p || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId]);

  const create = async () => {
    if (!form.patient_device_id?.trim()) return toast.error("Patient device id required");
    const payload: any = { ...form, organization_id: organizationId };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    const { error } = await (supabase as any).from("rcm_eligibility_checks").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Eligibility check recorded");
    setForm({ status: "pending", exception_type: "none" }); setShowAdd(false); load();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-100";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Activity size={14} />Eligibility Checks ({rows.length})</h3>
        <button onClick={() => setShowAdd(s => !s)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs flex items-center gap-1.5">
          <Plus size={12} /> New check
        </button>
      </div>

      {showAdd && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-4 space-y-2">
          <input className={inputCls} placeholder="Patient device ID *" value={form.patient_device_id || ""} onChange={e => setForm({ ...form, patient_device_id: e.target.value })} />
          <input className={inputCls} placeholder="Visit ref" value={form.visit_ref || ""} onChange={e => setForm({ ...form, visit_ref: e.target.value })} />
          <select className={inputCls} value={form.payer_id || ""} onChange={e => setForm({ ...form, payer_id: e.target.value || null })}>
            <option value="">— Payer —</option>
            {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="eligible">Eligible</option>
              <option value="not_eligible">Not eligible</option>
              <option value="error">Error</option>
            </select>
            <select className={inputCls} value={form.exception_type} onChange={e => setForm({ ...form, exception_type: e.target.value })}>
              <option value="none">No exception</option>
              <option value="referral">Referral</option>
              <option value="emergency_ctas">Emergency (CTAS 1-2)</option>
              <option value="newborn">Newborn</option>
            </select>
          </div>
          <input className={inputCls} placeholder="NPHIES reference" value={form.nphies_reference || ""} onChange={e => setForm({ ...form, nphies_reference: e.target.value })} />
          <textarea className={inputCls} placeholder="Reason / notes" value={form.reason || ""} onChange={e => setForm({ ...form, reason: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={create} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {rows.length === 0 && <p className="text-slate-500 text-sm">No eligibility checks recorded for this org.</p>}
        {rows.map(r => {
          const ok = r.status === "eligible";
          const Icon = ok ? ShieldCheck : ShieldAlert;
          const color = ok ? "text-emerald-400" : r.status === "not_eligible" ? "text-rose-400" : "text-amber-400";
          return (
            <div key={r.id} className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <div className="flex items-start gap-3">
                <Icon size={16} className={color} />
                <div className="flex-1">
                  <p className="text-sm font-mono text-slate-100">{r.patient_device_id}</p>
                  <p className="text-[11px] text-slate-500">Visit {r.visit_ref || "—"} · {r.exception_type !== "none" && <span className="text-amber-300">{r.exception_type}</span>}</p>
                  {r.nphies_reference && <p className="text-[10px] font-mono text-slate-400 mt-0.5">NPHIES: {r.nphies_reference}</p>}
                  {r.reason && <p className="text-[11px] text-slate-300 mt-1 italic">"{r.reason}"</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${color} bg-slate-800`}>{r.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RcmEligibilityWorklist;
