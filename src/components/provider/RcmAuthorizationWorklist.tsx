import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Plus, Send, Clock, AlertTriangle, CheckCircle2, XCircle, RefreshCw, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface Props { organizationId: string; }

const STATUS_COLORS: Record<string, string> = {
  draft: "text-slate-400 bg-slate-800",
  submitted: "text-sky-300 bg-sky-500/15",
  in_review: "text-indigo-300 bg-indigo-500/15",
  additional_info_requested: "text-amber-300 bg-amber-500/15",
  approved: "text-emerald-300 bg-emerald-500/15",
  partial: "text-amber-300 bg-amber-500/15",
  conditional: "text-cyan-300 bg-cyan-500/15",
  rejected: "text-rose-300 bg-rose-500/15",
  cancelled: "text-slate-500 bg-slate-800",
  expired: "text-rose-400 bg-rose-500/10",
};

const RcmAuthorizationWorklist = ({ organizationId }: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, any[]>>({});
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [form, setForm] = useState<any>({ encounter_type: "op", priority: "routine" });

  const load = async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      (supabase as any).from("rcm_authorization_requests").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("rcm_payers").select("id, name").order("name"),
    ]);
    setRows(r || []); setPayers(p || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId]);

  // Realtime subscription for live payer responses
  useEffect(() => {
    const ch = (supabase as any).channel(`auth:${organizationId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "rcm_authorization_requests", filter: `organization_id=eq.${organizationId}` },
        () => load())
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
    // eslint-disable-next-line
  }, [organizationId]);

  const expand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!events[id]) {
      const [{ data: ev }, { data: it }] = await Promise.all([
        (supabase as any).from("rcm_authorization_events").select("*").eq("request_id", id).order("created_at", { ascending: false }),
        (supabase as any).from("rcm_authorization_items").select("*").eq("request_id", id).order("created_at"),
      ]);
      setEvents(e => ({ ...e, [id]: ev || [] }));
      setItems(i => ({ ...i, [id]: it || [] }));
    }
  };

  const create = async () => {
    if (!form.patient_device_id?.trim()) return toast.error("Patient device id required");
    if (!form.visit_ref?.trim()) return toast.error("Visit reference required");
    const tat = new Date(); tat.setHours(tat.getHours() + (form.priority === "stat" ? 1 : form.priority === "emergency" ? 4 : form.priority === "urgent" ? 12 : 48));
    const payload: any = {
      ...form,
      organization_id: organizationId,
      tat_due_at: tat.toISOString(),
      status: "draft",
    };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    const { data, error } = await (supabase as any).from("rcm_authorization_requests").insert(payload).select().single();
    if (error) return toast.error(error.message);
    await (supabase as any).from("rcm_authorization_events").insert({ request_id: data.id, event_type: "created", notes: "Authorization drafted" });
    toast.success("Authorization created (draft)");
    setForm({ encounter_type: "op", priority: "routine" }); setShowAdd(false); load();
  };

  const setStatus = async (id: string, status: string, note?: string) => {
    const patch: any = { status };
    if (status === "submitted") patch.submitted_at = new Date().toISOString();
    if (["approved","partial","conditional","rejected","expired","cancelled"].includes(status)) patch.decided_at = new Date().toISOString();
    const { error } = await (supabase as any).from("rcm_authorization_requests").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await (supabase as any).from("rcm_authorization_events").insert({
      request_id: id,
      event_type: status === "submitted" ? "submitted" : status === "additional_info_requested" ? "additional_info_requested" : "final_decision",
      notes: note || `Status → ${status}`,
    });
    toast.success(`Status updated to ${status}`);
    setEvents(e => ({ ...e, [id]: [] })); // force reload
    if (expanded === id) { setExpanded(null); setTimeout(() => expand(id), 50); }
    load();
  };

  const followUp = async (id: string) => {
    const note = prompt("Follow-up note (optional)") || undefined;
    const { error } = await (supabase as any).rpc("rcm_auth_follow_up", { _request_id: id, _hours: 24, _note: note });
    if (error) return toast.error(error.message);
    toast.success("Follow-up sent · TAT extended +24h");
    setEvents(e => ({ ...e, [id]: [] }));
    if (expanded === id) { setExpanded(null); setTimeout(() => expand(id), 50); }
    load();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-100";
  const filtered = filter === "all" ? rows : rows.filter(r => r.status === filter);

  const tatBadge = (r: any) => {
    if (!r.tat_due_at) return null;
    const ms = new Date(r.tat_due_at).getTime() - Date.now();
    const hrs = Math.round(ms / 3600000);
    const overdue = ms < 0;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${overdue ? "bg-rose-500/20 text-rose-300" : hrs < 6 ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-400"}`}>
        <Clock size={10} />{overdue ? `Overdue ${Math.abs(hrs)}h` : `TAT ${hrs}h`}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck size={14} />Authorizations ({rows.length})</h3>
        <button onClick={() => setShowAdd(s => !s)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs flex items-center gap-1.5">
          <Plus size={12} /> New
        </button>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {["all","draft","submitted","in_review","additional_info_requested","approved","partial","conditional","rejected"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-2 py-1 rounded-full text-[10px] uppercase ${filter === s ? "bg-amber-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-400"}`}>
            {s.replace(/_/g," ")}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Patient device ID *" value={form.patient_device_id || ""} onChange={e => setForm({ ...form, patient_device_id: e.target.value })} />
            <input className={inputCls} placeholder="Visit ref *" value={form.visit_ref || ""} onChange={e => setForm({ ...form, visit_ref: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={form.encounter_type} onChange={e => setForm({ ...form, encounter_type: e.target.value })}>
              <option value="op">Outpatient</option>
              <option value="er">Emergency</option>
              <option value="ip">Inpatient</option>
              <option value="dc">Day Case</option>
            </select>
            <select className={inputCls} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="routine">Routine (TAT 48h)</option>
              <option value="urgent">Urgent (12h)</option>
              <option value="emergency">Emergency (4h)</option>
              <option value="stat">Stat (1h)</option>
            </select>
          </div>
          <select className={inputCls} value={form.payer_id || ""} onChange={e => setForm({ ...form, payer_id: e.target.value || null })}>
            <option value="">— Payer —</option>
            {payers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className={inputCls} placeholder="ICD-10 codes (comma-separated)" onChange={e => setForm({ ...form, diagnosis_codes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
          <textarea className={inputCls} placeholder="Clinical notes / justification" value={form.clinical_notes || ""} onChange={e => setForm({ ...form, clinical_notes: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={create} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Save draft</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.length === 0 && <p className="text-slate-500 text-sm">No authorizations.</p>}
        {filtered.map(r => {
          const open = expanded === r.id;
          const color = STATUS_COLORS[r.status] || "text-slate-400 bg-slate-800";
          return (
            <div key={r.id} className="rounded-lg border border-slate-800 bg-slate-900/40">
              <div className="p-3 flex items-start gap-3">
                <FileText size={16} className="text-slate-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-mono text-slate-100">{r.visit_ref || "—"}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${color}`}>{r.status.replace(/_/g," ")}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{r.encounter_type} · {r.priority}</span>
                    {tatBadge(r)}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">Device {r.patient_device_id || "—"} · Payer {payers.find(p => p.id === r.payer_id)?.name || "—"}</p>
                  {r.rejection_reason && <p className="text-[11px] text-rose-300 mt-1">Rejected: {r.rejection_reason}</p>}
                  {r.partial_reason && <p className="text-[11px] text-amber-300 mt-1">Partial: {r.partial_reason}</p>}
                  {r.conditional_terms && <p className="text-[11px] text-cyan-300 mt-1">Conditions: {r.conditional_terms}</p>}
                </div>
                <button onClick={() => expand(r.id)} className="p-1 text-slate-400 hover:text-slate-200">
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {open && (
                <div className="px-3 pb-3 border-t border-slate-800 pt-3 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {r.status === "draft" && (
                      <button onClick={() => setStatus(r.id, "submitted")} className="px-2.5 py-1 rounded bg-sky-600 text-white text-[11px] flex items-center gap-1"><Send size={10} />Submit to payer</button>
                    )}
                    {["submitted","in_review","additional_info_requested"].includes(r.status) && (
                      <>
                        <button onClick={() => followUp(r.id)} className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-[11px] font-semibold flex items-center gap-1"><RefreshCw size={10} />Follow-up</button>
                        <button onClick={() => setStatus(r.id, "approved", "Payer approved")} className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] flex items-center gap-1"><CheckCircle2 size={10} />Mark approved</button>
                        <button onClick={() => setStatus(r.id, "partial", prompt("Partial reason") || "Partial approval")} className="px-2.5 py-1 rounded bg-amber-600 text-white text-[11px] flex items-center gap-1"><AlertTriangle size={10} />Partial</button>
                        <button onClick={() => setStatus(r.id, "conditional", prompt("Conditions") || "Conditional approval")} className="px-2.5 py-1 rounded bg-cyan-600 text-white text-[11px] flex items-center gap-1"><AlertTriangle size={10} />Conditional</button>
                        <button onClick={() => setStatus(r.id, "rejected", prompt("Rejection reason") || "Rejected")} className="px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] flex items-center gap-1"><XCircle size={10} />Reject</button>
                      </>
                    )}
                    {!["cancelled","expired","rejected","approved"].includes(r.status) && (
                      <button onClick={() => setStatus(r.id, "cancelled", "Cancelled by provider")} className="px-2.5 py-1 rounded bg-slate-700 text-slate-200 text-[11px]">Cancel</button>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Timeline</p>
                    <div className="space-y-1">
                      {(events[r.id] || []).length === 0 && <p className="text-[11px] text-slate-500">No events yet.</p>}
                      {(events[r.id] || []).map(e => (
                        <div key={e.id} className="text-[11px] flex items-start gap-2">
                          <span className="text-slate-500 font-mono">{new Date(e.created_at).toLocaleString()}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase text-[9px]">{e.event_type.replace(/_/g," ")}</span>
                          {e.notes && <span className="text-slate-300 flex-1">{e.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RcmAuthorizationWorklist;
