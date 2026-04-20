import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, FileText, DollarSign, Stethoscope, Activity, Receipt, CreditCard } from "lucide-react";

interface Props { organizationId: string; }

const KIND_OPTS = [
  { v: "op_clinic", l: "OP · Clinic" },
  { v: "op_walkin", l: "OP · Walk-in" },
  { v: "er_triage", l: "ER · Triage" },
  { v: "er_resus", l: "ER · Resuscitation" },
  { v: "telemed", l: "Telemedicine" },
];

const TRIAGE = [
  { v: "none", l: "—" },
  { v: "1_resuscitation", l: "1 Resuscitation" },
  { v: "2_emergent", l: "2 Emergent" },
  { v: "3_urgent", l: "3 Urgent" },
  { v: "4_less_urgent", l: "4 Less urgent" },
  { v: "5_non_urgent", l: "5 Non-urgent" },
];

const SVC_KINDS = ["consultation", "lab", "radiology", "procedure", "medication", "supply", "room", "observation", "other"];
const PAY_METHODS = ["cash", "card", "bank_transfer", "wallet", "insurance_writeoff", "adjustment"];

const RcmOpErWorklist = ({ organizationId }: Props) => {
  const [visits, setVisits] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showSvc, setShowSvc] = useState(false);
  const [showDx, setShowDx] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const [nv, setNv] = useState<any>({ visit_kind: "op_clinic", triage_level: "none", chief_complaint: "", attending_name: "", specialty: "", patient_device_id: "", is_self_pay: false });
  const [svc, setSvc] = useState<any>({ line_kind: "consultation", service_code: "", service_name: "", qty: 1, unit_price: 0, coverage_pct: 80, vat_pct: 15 });
  const [dx, setDx] = useState<any>({ code: "", description: "", role: "principal" });
  const [pay, setPay] = useState<any>({ amount: 0, method: "cash", reference: "" });

  const loadVisits = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("rcm_visits").select("*").eq("organization_id", organizationId).order("arrival_at", { ascending: false }).limit(50);
    setVisits(data || []); setLoading(false);
  };

  const loadDetail = async (v: any) => {
    setSelected(v);
    const [s, d, i] = await Promise.all([
      (supabase as any).from("rcm_visit_services").select("*").eq("visit_id", v.id).order("created_at"),
      (supabase as any).from("rcm_visit_diagnoses").select("*").eq("visit_id", v.id),
      (supabase as any).from("rcm_visit_invoices").select("*").eq("visit_id", v.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setServices(s.data || []); setDiagnoses(d.data || []); setInvoice(i.data || null);
    if (i.data) {
      const { data: p } = await (supabase as any).from("rcm_visit_payments").select("*").eq("invoice_id", i.data.id).order("collected_at", { ascending: false });
      setPayments(p || []);
    } else setPayments([]);
  };

  useEffect(() => { loadVisits(); /* eslint-disable-next-line */ }, [organizationId]);

  const createVisit = async () => {
    if (!nv.chief_complaint?.trim()) return toast.error("Chief complaint required");
    const payload: any = { ...nv, organization_id: organizationId };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    const { data, error } = await (supabase as any).from("rcm_visits").insert(payload).select().single();
    if (error) return toast.error(error.message);
    toast.success(`Visit ${data.visit_no} opened`); setNv({ visit_kind: "op_clinic", triage_level: "none", chief_complaint: "", attending_name: "", specialty: "", patient_device_id: "", is_self_pay: false });
    setShowNew(false); loadVisits(); loadDetail(data);
  };

  const setStatus = async (status: string) => {
    if (!selected) return;
    const patch: any = { status };
    if (status === "discharged") patch.discharge_at = new Date().toISOString();
    if (status === "billed" && !invoice) {
      // Auto-issue invoice
      const { data: inv, error: ie } = await (supabase as any).from("rcm_visit_invoices").insert({ visit_id: selected.id, status: "issued", issued_at: new Date().toISOString() }).select().single();
      if (ie) return toast.error(ie.message);
      setInvoice(inv);
    }
    const { error } = await (supabase as any).from("rcm_visits").update(patch).eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success(`Status → ${status}`); loadVisits(); loadDetail({ ...selected, ...patch });
  };

  const addService = async () => {
    if (!selected || !svc.service_code || !svc.service_name) return toast.error("Code & name required");
    const { error } = await (supabase as any).from("rcm_visit_services").insert({ ...svc, visit_id: selected.id });
    if (error) return toast.error(error.message);
    setSvc({ line_kind: "consultation", service_code: "", service_name: "", qty: 1, unit_price: 0, coverage_pct: 80, vat_pct: 15 });
    setShowSvc(false); loadDetail(selected);
  };

  const delService = async (id: string) => {
    if (!confirm("Delete this line?")) return;
    await (supabase as any).from("rcm_visit_services").delete().eq("id", id);
    loadDetail(selected);
  };

  const addDx = async () => {
    if (!selected || !dx.code) return toast.error("ICD code required");
    const { error } = await (supabase as any).from("rcm_visit_diagnoses").insert({ ...dx, visit_id: selected.id });
    if (error) return toast.error(error.message);
    setDx({ code: "", description: "", role: "principal" }); setShowDx(false); loadDetail(selected);
  };

  const issueInvoice = async () => {
    if (!selected) return;
    if (invoice && invoice.status === "issued") return toast.info("Already issued");
    if (invoice) {
      const { error } = await (supabase as any).from("rcm_visit_invoices").update({ status: "issued", issued_at: new Date().toISOString() }).eq("id", invoice.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await (supabase as any).from("rcm_visit_invoices").insert({ visit_id: selected.id, status: "issued", issued_at: new Date().toISOString() });
      if (error) return toast.error(error.message);
    }
    toast.success("Invoice issued — patient notified"); loadDetail(selected);
  };

  const collect = async () => {
    if (!invoice || !pay.amount) return toast.error("Amount required");
    const { error } = await (supabase as any).from("rcm_visit_payments").insert({ ...pay, invoice_id: invoice.id, amount: parseFloat(pay.amount) });
    if (error) return toast.error(error.message);
    toast.success("Payment recorded");
    setPay({ amount: 0, method: "cash", reference: "" }); setShowPay(false); loadDetail(selected);
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-100";
  const fmt = (n: any) => Number(n || 0).toFixed(2);
  const statusColor = (s: string) => ({
    open: "bg-sky-500/15 text-sky-300", in_progress: "bg-amber-500/15 text-amber-300",
    discharged: "bg-violet-500/15 text-violet-300", billed: "bg-emerald-500/15 text-emerald-300",
    closed: "bg-slate-500/15 text-slate-300", cancelled: "bg-rose-500/15 text-rose-300",
  } as any)[s] || "bg-slate-700/30 text-slate-300";

  return (
    <div className="grid md:grid-cols-[340px_1fr] gap-4">
      {/* List */}
      <aside className="rounded-2xl p-3 bg-slate-900/50 border border-slate-800 max-h-[75vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3 sticky top-0 bg-slate-900/80 backdrop-blur p-1 -m-1">
          <p className="text-sm font-semibold text-slate-200">Visits ({visits.length})</p>
          <button onClick={() => setShowNew(s => !s)} className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs flex items-center gap-1">
            <Plus size={11} /> New
          </button>
        </div>

        {showNew && (
          <div className="space-y-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-3">
            <select className={inputCls} value={nv.visit_kind} onChange={e => setNv({ ...nv, visit_kind: e.target.value })}>
              {KIND_OPTS.map(k => <option key={k.v} value={k.v}>{k.l}</option>)}
            </select>
            {nv.visit_kind.startsWith("er") && (
              <select className={inputCls} value={nv.triage_level} onChange={e => setNv({ ...nv, triage_level: e.target.value })}>
                {TRIAGE.map(t => <option key={t.v} value={t.v}>Triage: {t.l}</option>)}
              </select>
            )}
            <input className={inputCls} placeholder="Patient device id" value={nv.patient_device_id} onChange={e => setNv({ ...nv, patient_device_id: e.target.value })} />
            <input className={inputCls} placeholder="Chief complaint *" value={nv.chief_complaint} onChange={e => setNv({ ...nv, chief_complaint: e.target.value })} />
            <input className={inputCls} placeholder="Attending name" value={nv.attending_name} onChange={e => setNv({ ...nv, attending_name: e.target.value })} />
            <input className={inputCls} placeholder="Specialty" value={nv.specialty} onChange={e => setNv({ ...nv, specialty: e.target.value })} />
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={nv.is_self_pay} onChange={e => setNv({ ...nv, is_self_pay: e.target.checked })} /> Self-pay
            </label>
            <button onClick={createVisit} className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Open visit</button>
          </div>
        )}

        {loading ? <p className="text-slate-500 text-sm">Loading…</p>
          : visits.length === 0 ? <p className="text-slate-500 text-sm">No visits yet.</p>
          : <div className="space-y-1.5">
              {visits.map(v => (
                <button key={v.id} onClick={() => loadDetail(v)} className={`w-full text-left p-2.5 rounded-lg border ${selected?.id === v.id ? "border-amber-500/60 bg-amber-500/5" : "border-slate-800 bg-slate-900/40"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-slate-200">{v.visit_no}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColor(v.status)}`}>{v.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{v.chief_complaint}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{v.visit_kind} · {new Date(v.arrival_at).toLocaleString()}</p>
                </button>
              ))}
            </div>}
      </aside>

      {/* Detail */}
      <section className="rounded-2xl p-4 bg-slate-900/50 border border-slate-800 max-h-[75vh] overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center text-slate-500 text-sm h-full py-12">
            <Stethoscope size={32} className="mb-3 opacity-40" />
            Select or open a visit to manage diagnoses, services, and billing.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-100">{selected.visit_no}</p>
                <p className="text-xs text-slate-400">{selected.chief_complaint}</p>
                <p className="text-[11px] text-slate-500 mt-1">{selected.visit_kind} · {selected.attending_name || "—"} · {selected.specialty || "—"}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full ${statusColor(selected.status)}`}>{selected.status}</span>
            </div>

            {/* Status actions */}
            <div className="flex flex-wrap gap-1.5">
              {selected.status === "open" && <button onClick={() => setStatus("in_progress")} className="px-3 py-1.5 rounded-full text-xs bg-amber-500/15 text-amber-300">Start treatment</button>}
              {(selected.status === "open" || selected.status === "in_progress") && <button onClick={() => setStatus("discharged")} className="px-3 py-1.5 rounded-full text-xs bg-violet-500/15 text-violet-300">Discharge</button>}
              {selected.status !== "billed" && selected.status !== "closed" && <button onClick={() => setStatus("billed")} className="px-3 py-1.5 rounded-full text-xs bg-emerald-500/15 text-emerald-300">Mark billed + issue invoice</button>}
              {selected.status === "billed" && <button onClick={() => setStatus("closed")} className="px-3 py-1.5 rounded-full text-xs bg-slate-500/15 text-slate-300">Close</button>}
              {selected.status !== "cancelled" && selected.status !== "closed" && <button onClick={() => setStatus("cancelled")} className="px-3 py-1.5 rounded-full text-xs bg-rose-500/15 text-rose-300">Cancel</button>}
            </div>

            {/* Diagnoses */}
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5"><Activity size={13} /> Diagnoses ({diagnoses.length})</p>
                <button onClick={() => setShowDx(s => !s)} className="text-xs text-amber-400">+ Add</button>
              </div>
              {showDx && (
                <div className="space-y-2 p-3 rounded-lg border border-slate-700 bg-slate-900/60 mb-2">
                  <input className={inputCls} placeholder="ICD-10 code *" value={dx.code} onChange={e => setDx({ ...dx, code: e.target.value })} />
                  <input className={inputCls} placeholder="Description" value={dx.description} onChange={e => setDx({ ...dx, description: e.target.value })} />
                  <select className={inputCls} value={dx.role} onChange={e => setDx({ ...dx, role: e.target.value })}>
                    {["principal", "secondary", "admitting", "discharge"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button onClick={addDx} className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Add diagnosis</button>
                </div>
              )}
              {diagnoses.length === 0 ? <p className="text-xs text-slate-500">No diagnoses yet.</p>
                : <div className="space-y-1">{diagnoses.map(d => <div key={d.id} className="flex items-center justify-between text-xs p-2 rounded bg-slate-900/40 border border-slate-800"><span><span className="font-mono text-slate-200">{d.code}</span> · {d.description || "—"}</span><span className="text-[10px] text-slate-500">{d.role}</span></div>)}</div>}
            </div>

            {/* Services */}
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5"><FileText size={13} /> Services ({services.length})</p>
                <button onClick={() => setShowSvc(s => !s)} className="text-xs text-amber-400">+ Add</button>
              </div>
              {showSvc && (
                <div className="space-y-2 p-3 rounded-lg border border-slate-700 bg-slate-900/60 mb-2">
                  <select className={inputCls} value={svc.line_kind} onChange={e => setSvc({ ...svc, line_kind: e.target.value })}>
                    {SVC_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} placeholder="Service code *" value={svc.service_code} onChange={e => setSvc({ ...svc, service_code: e.target.value })} />
                    <input className={inputCls} placeholder="Service name *" value={svc.service_name} onChange={e => setSvc({ ...svc, service_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" className={inputCls} placeholder="Qty" value={svc.qty} onChange={e => setSvc({ ...svc, qty: parseFloat(e.target.value) || 1 })} />
                    <input type="number" step="0.01" className={inputCls} placeholder="Unit price" value={svc.unit_price} onChange={e => setSvc({ ...svc, unit_price: parseFloat(e.target.value) || 0 })} />
                    <input type="number" className={inputCls} placeholder="Coverage %" value={svc.coverage_pct} onChange={e => setSvc({ ...svc, coverage_pct: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <button onClick={addService} className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Add service line</button>
                </div>
              )}
              {services.length === 0 ? <p className="text-xs text-slate-500">No service lines yet.</p>
                : <div className="space-y-1">{services.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded bg-slate-900/40 border border-slate-800">
                      <div className="flex-1">
                        <p className="text-xs text-slate-100"><span className="font-mono">{s.service_code}</span> · {s.service_name}</p>
                        <p className="text-[10px] text-slate-500">{s.line_kind} · qty {s.qty} × {fmt(s.unit_price)} = net {fmt(s.net_amount)} · payer {fmt(s.payer_share)} / patient {fmt(s.patient_share)}</p>
                      </div>
                      <button onClick={() => delService(s.id)} className="p-1 rounded text-rose-400 hover:bg-rose-500/15"><Trash2 size={12} /></button>
                    </div>
                  ))}</div>}
            </div>

            {/* Invoice */}
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5"><Receipt size={13} /> Invoice</p>
                {!invoice || invoice.status === "draft" ? <button onClick={issueInvoice} className="text-xs px-3 py-1 rounded-full bg-emerald-600 text-white">Issue invoice</button> : null}
              </div>
              {!invoice ? <p className="text-xs text-slate-500">No invoice generated yet.</p>
                : <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/60 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Invoice #</span><span className="font-mono text-slate-100">{invoice.invoice_no}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Status</span><span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColor(invoice.status)}`}>{invoice.status}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Gross</span><span>{fmt(invoice.gross_total)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">VAT</span><span>{fmt(invoice.vat_total)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Net</span><span>{fmt(invoice.net_total)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Payer share</span><span className="text-emerald-300">{fmt(invoice.payer_share_total)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Patient share</span><span className="text-amber-300">{fmt(invoice.patient_share_total)}</span></div>
                    <div className="flex justify-between border-t border-slate-700 pt-1.5"><span className="text-slate-400">Paid</span><span>{fmt(invoice.paid_total)}</span></div>
                    <div className="flex justify-between font-semibold"><span className="text-slate-300">Balance due</span><span className="text-rose-300">{fmt(invoice.balance_due)} {invoice.currency}</span></div>
                  </div>}
            </div>

            {/* Payments */}
            {invoice && (
              <div className="border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5"><CreditCard size={13} /> Payments ({payments.length})</p>
                  <button onClick={() => setShowPay(s => !s)} className="text-xs text-amber-400">+ Collect</button>
                </div>
                {showPay && (
                  <div className="space-y-2 p-3 rounded-lg border border-slate-700 bg-slate-900/60 mb-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" step="0.01" className={inputCls} placeholder="Amount *" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} />
                      <select className={inputCls} value={pay.method} onChange={e => setPay({ ...pay, method: e.target.value })}>
                        {PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <input className={inputCls} placeholder="Reference (txn id, receipt #)" value={pay.reference} onChange={e => setPay({ ...pay, reference: e.target.value })} />
                    <button onClick={collect} className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5"><DollarSign size={12} /> Record payment</button>
                  </div>
                )}
                {payments.length === 0 ? <p className="text-xs text-slate-500">No payments collected.</p>
                  : <div className="space-y-1">{payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded bg-slate-900/40 border border-slate-800">
                        <span>{fmt(p.amount)} {invoice.currency} · <span className="text-slate-400">{p.method}</span> {p.reference && <span className="text-slate-500">· {p.reference}</span>}</span>
                        <span className="text-[10px] text-slate-500">{new Date(p.collected_at).toLocaleString()}</span>
                      </div>
                    ))}</div>}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default RcmOpErWorklist;
