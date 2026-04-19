import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Save, X } from "lucide-react";

interface Org {
  id: string; name: string; org_type: string;
  contact_email: string | null; contact_phone: string | null;
  country: string | null; website: string | null; notes: string | null;
  created_at: string;
}

const TYPES = ["hospital", "clinic", "vendor", "insurance", "patient_org", "other"] as const;

const AdminOrganizations = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Org>>({ org_type: "hospital", country: "Saudi Arabia" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrgs((data as Org[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    const { error } = await supabase.from("organizations").insert({
      name: form.name, org_type: (form.org_type as any) || "other",
      contact_email: form.contact_email || null, contact_phone: form.contact_phone || null,
      country: form.country || null, website: form.website || null, notes: form.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", { _action: "organization_created", _target_type: "organization", _target_id: null, _details: { name: form.name, org_type: form.org_type } });
    toast.success("Organization created");
    setCreating(false); setForm({ org_type: "hospital", country: "Saudi Arabia" }); load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.from("organizations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", { _action: "organization_deleted", _target_type: "organization", _target_id: id, _details: { name } });
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400">{orgs.length} organizations</p>
        <button onClick={() => setCreating(!creating)} className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5">
          <Plus size={14} /> New organization
        </button>
      </div>

      {creating && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Organization name *"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 col-span-2" />
            <select value={form.org_type} onChange={(e) => setForm({ ...form, org_type: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200">
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200" />
            <input value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="Contact email"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200" />
            <input value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="Phone"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200" />
            <input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website"
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 col-span-2" />
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 col-span-2" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 text-xs flex items-center gap-1"><X size={12}/>Cancel</button>
            <button onClick={create} className="px-3 py-1.5 rounded bg-emerald-500 text-slate-950 text-xs font-semibold flex items-center gap-1"><Save size={12}/>Save</button>
          </div>
        </div>
      )}

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && orgs.length === 0 && <p className="text-slate-500 text-sm">No organizations yet.</p>}

      {orgs.map((o) => (
        <div key={o.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={14} className="text-amber-400 shrink-0" />
                <h3 className="font-semibold text-sm text-slate-100">{o.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">{o.org_type}</span>
              </div>
              <p className="text-xs text-slate-400">{o.contact_email || "—"} · {o.contact_phone || "—"} · {o.country || "—"}</p>
              {o.website && <a href={o.website} target="_blank" rel="noreferrer" className="text-xs text-amber-300 hover:underline">{o.website}</a>}
              {o.notes && <p className="text-xs text-slate-500 mt-1">{o.notes}</p>}
            </div>
            <button onClick={() => remove(o.id, o.name)} className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 text-[11px] flex items-center gap-1"><Trash2 size={11}/>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminOrganizations;
