import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Send, DollarSign, FileWarning, Receipt, RefreshCw } from "lucide-react";

interface Props { organizationId: string; }

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  scrubbing: "bg-amber-500/15 text-amber-300",
  ready: "bg-cyan-500/15 text-cyan-300",
  submitted: "bg-blue-500/15 text-blue-300",
  accepted: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
  partially_paid: "bg-amber-500/20 text-amber-200",
  paid: "bg-emerald-600/30 text-emerald-200",
  denied: "bg-rose-500/20 text-rose-200",
  appealed: "bg-violet-500/15 text-violet-300",
  closed: "bg-slate-700 text-slate-200",
  void: "bg-slate-800 text-slate-500",
};

const RcmClaimsWorklist = ({ organizationId }: Props) => {
  const [claims, setClaims] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [denials, setDenials] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [showLine, setShowLine] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const [nc, setNc] = useState({ encounter_type: "op", patient_device_id: "", notes: "" });
  const [nl, setNl] = useState({ service_code: "", service_name: "", qty: 1, unit_price: 0, vat_amount: 0, discount_amount: 0 });
  const [np, setNp] = useState({ amount: 0, method: "bank_transfer", reference: "" });

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-100";

  const load = async () => {
    const { data } = await (supabase as any).from("rcm_claims").select("*")
      .eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
    setClaims(data || []);
  };

  const loadDetail = async (c: any) => {
    setSelected(c);
    const [l, s, p, d] = await Promise.all([
      (supabase as any).from("rcm_claim_lines").select("*").eq("claim_id", c.id).order("created_at"),
      (supabase as any).from("rcm_claim_submissions").select("*").eq("claim_id", c.id).order("submitted_at", { ascending: false }),
      (supabase as any).from("rcm_claim_payments").select("*").eq("claim_id", c.id).order("paid_at", { ascending: false }),
      (supabase as any).from("rcm_claim_denials").select("*").eq("claim_id", c.id).order("created_at", { ascending: false }),
    ]);
    setLines(l.data || []); setSubmissions(s.data || []); setPayments(p.data || []); setDenials(d.data || []);
  };

  useEffect(() => { load(); }, [organizationId]);

  const totals = claims.reduce((acc, c) => ({
    gross: acc.gross + Number(c.gross_amount || 0),
    paid: acc.paid + Number(c.paid_amount || 0),
    denied: acc.denied + Number(c.denied_amount || 0),
    outstanding: acc.outstanding + Number(c.outstanding_amount || 0),
  }), { gross: 0, paid: 0, denied: 0, outstanding: 0 });

  const create = async () => {
    if (!nc.patient_device_id.trim()) return toast.error("Patient device id required");
    const { data, error } = await (supabase as any).from("rcm_claims").insert({
      ...nc, organization_id: organizationId,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success(`Claim ${data.claim_no} created`);
    setShowNew(false); setNc({ encounter_type: "op", patient_device_id: "", notes: "" });
    load(); loadDetail(data);
  };

  const addLine = async () => {
    if (!selected) return;
    if (!nl.service_code.trim() || !nl.service_name.trim()) return toast.error("Service code & name required");
    const { error } = await (supabase as any).from("rcm_claim_lines").insert({
      ...nl, claim_id: selected.id,
      qty: parseFloat(String(nl.qty)) || 1,
      unit_price: parseFloat(String(nl.unit_price)) || 0,
      vat_amount: parseFloat(String(nl.vat_amount)) || 0,
      discount_amount: parseFloat(String(nl.discount_amount)) || 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Line added");
    setShowLine(false); setNl({ service_code: "", service_name: "", qty: 1, unit_price: 0, vat_amount: 0, discount_amount: 0 });
    loadDetail(selected); load();
  };

  const submit = async () => {
    if (!selected) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error: e1 } = await (supabase as any).from("rcm_claim_submissions").insert({
      claim_id: selected.id, status: "sent", submitted_by: userId,
      nphies_batch_id: `BATCH-${Date.now()}`,
    });
    if (e1) return toast.error(e1.message);
    await (supabase as any).from("rcm_claims").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", selected.id);
    toast.success("Claim submitted");
    load(); loadDetail({ ...selected, status: "submitted" });
  };

  const recordPayment = async () => {
    if (!selected) return;
    const amt = parseFloat(String(np.amount));
    if (!amt || amt <= 0) return toast.error("Amount required");
    const { error } = await (supabase as any).from("rcm_claim_payments").insert({
      claim_id: selected.id, amount: amt, method: np.method, reference: np.reference || null,
    });
    if (error) return toast.error(error.message);
    toast.success(`Payment SAR ${amt} recorded`);
    setShowPay(false); setNp({ amount: 0, method: "bank_transfer", reference: "" });
    loadDetail(selected); load();
  };

  return (
    <div className="space-y-4">
      {/* KPI dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { l: "Gross", v: totals.gross, c: "text-slate-200" },
          { l: "Paid", v: totals.paid, c: "text-emerald-300" },
          { l: "Denied", v: totals.denied, c: "text-rose-300" },
          { l: "Outstanding", v: totals.outstanding, c: "text-amber-300" },
        ].map(k => (
          <div key={k.l} className="rounded-xl p-3 bg-slate-900/40 border border-slate-800">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{k.l}</p>
            <p className={`text-lg font-mono ${k.c}`}>SAR {k.v.toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-[340px_1fr] gap-4">
        {/* Claim list */}
        <aside className="rounded-xl p-3 bg-slate-900/40 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Claims ({claims.length})</h3>
            <div className="flex gap-1.5">
              <button onClick={load} className="p-1.5 rounded-full bg-slate-800 text-slate-300"><RefreshCw size={11} /></button>
              <button onClick={() => setShowNew(s => !s)} className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1">
                <Plus size={12} /> New
              </button>
            </div>
          </div>

          {showNew && (
            <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 mb-3">
              <select className={inputCls} value={nc.encounter_type} onChange={e => setNc({ ...nc, encounter_type: e.target.value })}>
                <option value="op">Outpatient</option><option value="er">Emergency</option>
                <option value="ip">Inpatient</option><option value="dc">Day case</option>
              </select>
              <input className={inputCls} placeholder="Patient device id *" value={nc.patient_device_id} onChange={e => setNc({ ...nc, patient_device_id: e.target.value })} />
              <textarea className={inputCls} placeholder="Notes" value={nc.notes} onChange={e => setNc({ ...nc, notes: e.target.value })} />
              <button onClick={create} className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Create claim</button>
            </div>
          )}

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {claims.length === 0 ? <p className="text-xs text-slate-500">No claims yet.</p>
              : claims.map(c => (
                <button key={c.id} onClick={() => loadDetail(c)}
                  className={`w-full text-left p-2.5 rounded-lg border ${selected?.id === c.id ? "border-amber-500/50 bg-amber-500/5" : "border-slate-800 hover:border-slate-700"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-slate-300">{c.claim_no}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[c.status] || "bg-slate-700"}`}>{c.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{c.encounter_type} · Net SAR {Number(c.net_amount).toFixed(2)}</p>
                  <p className="text-[11px] text-amber-300/70">Outstanding: SAR {Number(c.outstanding_amount).toFixed(2)}</p>
                </button>
              ))}
          </div>
        </aside>

        {/* Detail */}
        <section className="rounded-xl p-4 bg-slate-900/40 border border-slate-800 min-h-[400px]">
          {!selected ? <p className="text-sm text-slate-500">Select a claim.</p>
            : <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-lg font-mono text-slate-100">{selected.claim_no}</p>
                  <p className="text-xs text-slate-500">{selected.encounter_type} · created {new Date(selected.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1.5">
                  {selected.status === "draft" && (
                    <button onClick={submit} className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5">
                      <Send size={12} /> Submit
                    </button>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLORS[selected.status] || ""}`}>{selected.status}</span>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-3 gap-2 mb-5 text-xs">
                <div className="p-2 rounded bg-slate-900/60"><span className="text-slate-500">Net</span><br /><span className="font-mono">SAR {Number(selected.net_amount).toFixed(2)}</span></div>
                <div className="p-2 rounded bg-slate-900/60"><span className="text-slate-500">Paid</span><br /><span className="font-mono text-emerald-300">SAR {Number(selected.paid_amount).toFixed(2)}</span></div>
                <div className="p-2 rounded bg-slate-900/60"><span className="text-slate-500">Outstanding</span><br /><span className="font-mono text-amber-300">SAR {Number(selected.outstanding_amount).toFixed(2)}</span></div>
              </div>

              {/* Lines */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-300">Lines ({lines.length})</h4>
                  <button onClick={() => setShowLine(s => !s)} className="text-xs text-amber-400">+ Add line</button>
                </div>
                {showLine && (
                  <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 mb-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input className={inputCls} placeholder="Service code *" value={nl.service_code} onChange={e => setNl({ ...nl, service_code: e.target.value })} />
                      <input className={inputCls} placeholder="Service name *" value={nl.service_name} onChange={e => setNl({ ...nl, service_name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <input type="number" className={inputCls} placeholder="Qty" value={nl.qty} onChange={e => setNl({ ...nl, qty: parseFloat(e.target.value) || 0 })} />
                      <input type="number" className={inputCls} placeholder="Unit price" value={nl.unit_price} onChange={e => setNl({ ...nl, unit_price: parseFloat(e.target.value) || 0 })} />
                      <input type="number" className={inputCls} placeholder="Discount" value={nl.discount_amount} onChange={e => setNl({ ...nl, discount_amount: parseFloat(e.target.value) || 0 })} />
                      <input type="number" className={inputCls} placeholder="VAT" value={nl.vat_amount} onChange={e => setNl({ ...nl, vat_amount: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <button onClick={addLine} className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Add</button>
                  </div>
                )}
                <div className="space-y-1">
                  {lines.map(l => (
                    <div key={l.id} className="text-xs p-2 rounded border border-slate-800 bg-slate-900/40 flex justify-between">
                      <span><span className="font-mono">{l.service_code}</span> · {l.service_name} × {l.qty}</span>
                      <span className="text-slate-300 font-mono">SAR {Number(l.net_amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"><DollarSign size={13} /> Payments / Settlement ({payments.length})</h4>
                  <button onClick={() => setShowPay(s => !s)} className="text-xs text-amber-400">+ Record</button>
                </div>
                {showPay && (
                  <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 mb-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" className={inputCls} placeholder="Amount" value={np.amount} onChange={e => setNp({ ...np, amount: parseFloat(e.target.value) || 0 })} />
                      <select className={inputCls} value={np.method} onChange={e => setNp({ ...np, method: e.target.value })}>
                        <option value="bank_transfer">Bank transfer</option><option value="cheque">Cheque</option>
                        <option value="cash">Cash</option><option value="card">Card</option><option value="offset">Offset</option>
                      </select>
                      <input className={inputCls} placeholder="Reference" value={np.reference} onChange={e => setNp({ ...np, reference: e.target.value })} />
                    </div>
                    <button onClick={recordPayment} className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Record payment</button>
                  </div>
                )}
                <div className="space-y-1">
                  {payments.map(p => (
                    <div key={p.id} className="text-xs p-2 rounded border border-slate-800 bg-slate-900/40 flex justify-between">
                      <span>{p.method} · {p.reference || "—"}</span>
                      <span className="font-mono text-emerald-300">SAR {Number(p.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Denials & submissions */}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5"><FileWarning size={13} /> Denials ({denials.length})</h4>
                  {denials.length === 0 ? <p className="text-xs text-slate-500">None.</p>
                    : denials.map(d => (
                      <div key={d.id} className="text-xs p-2 rounded border border-rose-500/20 bg-rose-500/5 mb-1">
                        <p className="font-semibold text-rose-300">{d.reason_code || "—"}</p>
                        <p className="text-slate-400">{d.reason_text}</p>
                        <p className="text-[10px] text-slate-500">SAR {Number(d.amount).toFixed(2)} · {d.appeal_status}</p>
                      </div>
                    ))}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5"><Receipt size={13} /> Submissions ({submissions.length})</h4>
                  {submissions.length === 0 ? <p className="text-xs text-slate-500">Not submitted.</p>
                    : submissions.map(s => (
                      <div key={s.id} className="text-xs p-2 rounded border border-slate-800 bg-slate-900/40 mb-1 flex justify-between">
                        <span>#{s.attempt_no} · {s.nphies_batch_id}</span>
                        <span className="text-slate-500">{s.status}</span>
                      </div>
                    ))}
                </div>
              </div>
            </>}
        </section>
      </div>
    </div>
  );
};

export default RcmClaimsWorklist;
