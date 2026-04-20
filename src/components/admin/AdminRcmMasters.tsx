import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Building, Layers, FileText, Network, Tag, Boxes, Percent } from "lucide-react";

type Section = "tpas" | "payers" | "policies" | "classes" | "networks" | "price_lists" | "packages" | "discounts";

const SECTIONS: { id: Section; label: string; icon: any; table: string }[] = [
  { id: "tpas", label: "TPAs", icon: Building, table: "rcm_tpas" },
  { id: "payers", label: "Payers / Insurance", icon: Building, table: "rcm_payers" },
  { id: "policies", label: "Policies", icon: FileText, table: "rcm_policies" },
  { id: "classes", label: "Classes (Agreements)", icon: Layers, table: "rcm_classes" },
  { id: "networks", label: "Networks", icon: Network, table: "rcm_networks" },
  { id: "price_lists", label: "Price Lists", icon: Tag, table: "rcm_price_lists" },
  { id: "packages", label: "Packages", icon: Boxes, table: "rcm_packages" },
  { id: "discounts", label: "Discount Rules", icon: Percent, table: "rcm_discount_rules" },
];

const AdminRcmMasters = () => {
  const [section, setSection] = useState<Section>("tpas");
  const [rows, setRows] = useState<any[]>([]);
  const [parents, setParents] = useState<{ tpas: any[]; payers: any[]; policies: any[] }>({ tpas: [], payers: [], policies: [] });
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({});

  const cur = SECTIONS.find(s => s.id === section)!;

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from(cur.table).select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data || []);
    // Load parents for selects
    const [t, p, pol] = await Promise.all([
      (supabase as any).from("rcm_tpas").select("id, name").order("name"),
      (supabase as any).from("rcm_payers").select("id, name").order("name"),
      (supabase as any).from("rcm_policies").select("id, name, payer_id").order("name"),
    ]);
    setParents({ tpas: t.data || [], payers: p.data || [], policies: pol.data || [] });
    setLoading(false);
  };

  useEffect(() => { setForm({}); setShowAdd(false); load(); /* eslint-disable-next-line */ }, [section]);

  const create = async () => {
    if (!form.name?.trim() && section !== "discounts") return toast.error("Name required");
    const payload: any = { ...form };
    // Coerce empty strings to null
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    const { error } = await (supabase as any).from(cur.table).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Created");
    setForm({}); setShowAdd(false); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this record? Linked children may also be removed.")) return;
    const { error } = await (supabase as any).from(cur.table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-100";

  const renderForm = () => {
    switch (section) {
      case "tpas":
        return (<>
          <input className={inputCls} placeholder="Name *" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Arabic name" value={form.name_ar || ""} onChange={e => setForm({ ...form, name_ar: e.target.value })} />
          <input className={inputCls} placeholder="Code (unique)" value={form.code || ""} onChange={e => setForm({ ...form, code: e.target.value })} />
          <input className={inputCls} placeholder="VAT no." value={form.vat_no || ""} onChange={e => setForm({ ...form, vat_no: e.target.value })} />
          <input className={inputCls} placeholder="Internal serial" value={form.internal_serial || ""} onChange={e => setForm({ ...form, internal_serial: e.target.value })} />
        </>);
      case "payers":
        return (<>
          <select className={inputCls} value={form.tpa_id || ""} onChange={e => setForm({ ...form, tpa_id: e.target.value || null })}>
            <option value="">— No TPA —</option>
            {parents.tpas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className={inputCls} placeholder="Payer name *" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Arabic name" value={form.name_ar || ""} onChange={e => setForm({ ...form, name_ar: e.target.value })} />
          <input className={inputCls} placeholder="VAT no." value={form.vat_no || ""} onChange={e => setForm({ ...form, vat_no: e.target.value })} />
          <input className={inputCls} placeholder="CHE no." value={form.che_no || ""} onChange={e => setForm({ ...form, che_no: e.target.value })} />
          <input type="date" className={inputCls} value={form.contract_expiry || ""} onChange={e => setForm({ ...form, contract_expiry: e.target.value })} />
        </>);
      case "policies":
        return (<>
          <select className={inputCls} value={form.payer_id || ""} onChange={e => setForm({ ...form, payer_id: e.target.value })}>
            <option value="">— Select payer * —</option>
            {parents.payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className={inputCls} placeholder="Policy name *" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Policy no. *" value={form.policy_no || ""} onChange={e => setForm({ ...form, policy_no: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className={inputCls} placeholder="From" value={form.effective_from || ""} onChange={e => setForm({ ...form, effective_from: e.target.value })} />
            <input type="date" className={inputCls} placeholder="To" value={form.effective_to || ""} onChange={e => setForm({ ...form, effective_to: e.target.value })} />
          </div>
        </>);
      case "classes":
        return (<>
          <select className={inputCls} value={form.policy_id || ""} onChange={e => setForm({ ...form, policy_id: e.target.value })}>
            <option value="">— Select policy * —</option>
            {parents.policies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className={inputCls} placeholder="Class name *" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={form.deductible_type || ""} onChange={e => setForm({ ...form, deductible_type: e.target.value || null })}>
              <option value="">Deductible type</option>
              <option value="percentage">Percentage</option>
              <option value="amount">Amount</option>
            </select>
            <input type="number" step="0.01" className={inputCls} placeholder="Deductible value" value={form.deductible_value || ""} onChange={e => setForm({ ...form, deductible_value: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" className={inputCls} placeholder="Maximum limit" value={form.maximum_limit || ""} onChange={e => setForm({ ...form, maximum_limit: e.target.value })} />
            <input type="number" step="0.01" className={inputCls} placeholder="Approval limit" value={form.approval_limit || ""} onChange={e => setForm({ ...form, approval_limit: e.target.value })} />
          </div>
          <select className={inputCls} value={form.room_type || ""} onChange={e => setForm({ ...form, room_type: e.target.value || null })}>
            <option value="">Room type</option>
            {["ward","semi_private","private","vip","suite","icu","ccu","hdu","nicu","picu"].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </>);
      case "networks":
        return (<>
          <select className={inputCls} value={form.payer_id || ""} onChange={e => setForm({ ...form, payer_id: e.target.value || null })}>
            <option value="">— No payer —</option>
            {parents.payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className={inputCls} placeholder="Network name *" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Code" value={form.code || ""} onChange={e => setForm({ ...form, code: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" className={inputCls} placeholder="Max limit override" value={form.maximum_limit || ""} onChange={e => setForm({ ...form, maximum_limit: e.target.value })} />
            <input type="number" step="0.01" className={inputCls} placeholder="Approval limit override" value={form.approval_limit || ""} onChange={e => setForm({ ...form, approval_limit: e.target.value })} />
          </div>
        </>);
      case "price_lists":
        return (<>
          <input className={inputCls} placeholder="Name *" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Currency (SAR)" value={form.currency || "SAR"} onChange={e => setForm({ ...form, currency: e.target.value })} />
          <select className={inputCls} value={form.payer_id || ""} onChange={e => setForm({ ...form, payer_id: e.target.value || null })}>
            <option value="">— No payer (generic) —</option>
            {parents.payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className={inputCls} value={form.effective_from || ""} onChange={e => setForm({ ...form, effective_from: e.target.value })} />
            <input type="date" className={inputCls} value={form.effective_to || ""} onChange={e => setForm({ ...form, effective_to: e.target.value })} />
          </div>
        </>);
      case "packages":
        return (<>
          <input className={inputCls} placeholder="Code *" value={form.code || ""} onChange={e => setForm({ ...form, code: e.target.value })} />
          <input className={inputCls} placeholder="Name *" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input type="number" className={inputCls} placeholder="Duration days" value={form.duration_days || 1} onChange={e => setForm({ ...form, duration_days: parseInt(e.target.value) || 1 })} />
          <select className={inputCls} value={form.payer_id || ""} onChange={e => setForm({ ...form, payer_id: e.target.value || null })}>
            <option value="">— No payer —</option>
            {parents.payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </>);
      case "discounts":
        return (<>
          <select className={inputCls} value={form.payer_id || ""} onChange={e => setForm({ ...form, payer_id: e.target.value })}>
            <option value="">— Select payer * —</option>
            {parents.payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className={inputCls} value={form.kind || ""} onChange={e => setForm({ ...form, kind: e.target.value })}>
            <option value="">— Kind * —</option>
            <option value="prompt_payment">Prompt payment</option>
            <option value="volume">Volume</option>
            <option value="contractual_other">Contractual (other)</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" className={inputCls} placeholder="Percent (%)" value={form.pct || ""} onChange={e => setForm({ ...form, pct: e.target.value })} />
            <input type="number" step="0.01" className={inputCls} placeholder="Fixed amount" value={form.amount || ""} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
          <textarea className={inputCls} placeholder="Conditions" value={form.conditions || ""} onChange={e => setForm({ ...form, conditions: e.target.value })} />
        </>);
    }
  };

  const renderRow = (r: any) => {
    const sub = section === "payers" ? parents.tpas.find(t => t.id === r.tpa_id)?.name
      : section === "policies" ? parents.payers.find(p => p.id === r.payer_id)?.name
      : section === "classes" ? parents.policies.find(p => p.id === r.policy_id)?.name
      : section === "discounts" ? `${r.kind} · ${parents.payers.find(p => p.id === r.payer_id)?.name || ""}`
      : null;
    const title = r.name || r.code || r.kind;
    return (
      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/40">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-100">{title}</p>
          {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
          {r.policy_no && <p className="text-[11px] text-slate-500 font-mono">Policy #{r.policy_no}</p>}
          {r.pct != null && <p className="text-[11px] text-emerald-400">{r.pct}%</p>}
        </div>
        <button onClick={() => del(r.id)} className="p-1.5 rounded text-rose-400 hover:bg-rose-500/15"><Trash2 size={14} /></button>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 ${section === s.id ? "bg-amber-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-300"}`}>
              <Icon size={12} /> {s.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">{cur.label} ({rows.length})</h3>
        <button onClick={() => setShowAdd(s => !s)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs flex items-center gap-1.5">
          <Plus size={12} /> New
        </button>
      </div>

      {showAdd && (
        <div className="space-y-2 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-4">
          {renderForm()}
          <div className="flex gap-2 pt-1">
            <button onClick={create} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Save</button>
            <button onClick={() => { setShowAdd(false); setForm({}); }} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-slate-500 text-sm">Loading…</p>
        : rows.length === 0 ? <p className="text-slate-500 text-sm">No records yet.</p>
        : <div className="space-y-1.5">{rows.map(renderRow)}</div>}
    </div>
  );
};

export default AdminRcmMasters;
