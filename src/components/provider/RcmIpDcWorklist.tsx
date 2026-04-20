import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, BedDouble, ClipboardCheck, FileCheck2, DollarSign, LogOut, Activity, Clock } from "lucide-react";

interface Props { organizationId: string; }

const ADM_TYPES = [
  { v: "day_case", l: "Day Case" },
  { v: "elective", l: "Elective" },
  { v: "emergency", l: "Emergency" },
  { v: "observation", l: "Observation" },
  { v: "transfer_in", l: "Transfer In" },
];
const ROOM_TYPES = ["ward","semi_private","private","vip","suite","icu","ccu","hdu","nicu","picu"];
const STAGES: { v: string; l: string; icon: any }[] = [
  { v: "discharge_advice", l: "Advice", icon: ClipboardCheck },
  { v: "discharge_order", l: "Order", icon: FileCheck2 },
  { v: "service_reconciliation", l: "Reconcile", icon: Activity },
  { v: "financial_discharge", l: "Financial", icon: DollarSign },
  { v: "left_facility", l: "Left", icon: LogOut },
];

const STATUS_COLORS: Record<string, string> = {
  admitted: "bg-blue-500/15 text-blue-300",
  in_treatment: "bg-cyan-500/15 text-cyan-300",
  discharge_advised: "bg-amber-500/15 text-amber-300",
  discharge_ordered: "bg-amber-500/20 text-amber-200",
  service_reconciled: "bg-violet-500/15 text-violet-300",
  financial_discharged: "bg-emerald-500/15 text-emerald-300",
  discharged: "bg-slate-500/15 text-slate-300",
  cancelled: "bg-rose-500/15 text-rose-300",
};

const RcmIpDcWorklist = ({ organizationId }: Props) => {
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [beds, setBeds] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [losExt, setLosExt] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [showBed, setShowBed] = useState(false);
  const [showLos, setShowLos] = useState(false);
  const [loading, setLoading] = useState(false);

  const [na, setNa] = useState<any>({ admission_type: "elective", patient_device_id: "", attending_name: "", specialty: "", ward: "", planned_los_days: 1 });
  const [bed, setBed] = useState<any>({ ward: "", room_no: "", bed_no: "", room_type: "private", daily_rate: 500 });
  const [los, setLos] = useState<any>({ requested_extra_days: 1, clinical_justification: "" });

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-100";

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("rcm_admissions").select("*").eq("organization_id", organizationId).order("admitted_at", { ascending: false }).limit(100);
    setAdmissions(data || []); setLoading(false);
  };

  const loadDetail = async (a: any) => {
    setSelected(a);
    const [b, s, l] = await Promise.all([
      (supabase as any).from("rcm_bed_assignments").select("*").eq("admission_id", a.id).order("check_in_at", { ascending: false }),
      (supabase as any).from("rcm_discharge_steps").select("*").eq("admission_id", a.id).order("occurred_at", { ascending: false }),
      (supabase as any).from("rcm_los_extensions").select("*").eq("admission_id", a.id).order("created_at", { ascending: false }),
    ]);
    setBeds(b.data || []); setSteps(s.data || []); setLosExt(l.data || []);
  };

  useEffect(() => { load(); }, [organizationId]);

  const create = async () => {
    if (!na.patient_device_id?.trim()) return toast.error("Patient device id is required");
    const payload = { ...na, organization_id: organizationId, planned_los_days: parseInt(na.planned_los_days) || 1 };
    const { data, error } = await (supabase as any).from("rcm_admissions").insert(payload).select().single();
    if (error) return toast.error(error.message);
    toast.success(`Admitted · ${data.admission_no}`);
    setShowNew(false); setNa({ admission_type: "elective", patient_device_id: "", attending_name: "", specialty: "", ward: "", planned_los_days: 1 });
    load();
  };

  const addBed = async () => {
    if (!selected) return;
    // Check-out previous open bed
    await (supabase as any).from("rcm_bed_assignments").update({ check_out_at: new Date().toISOString() })
      .eq("admission_id", selected.id).is("check_out_at", null);
    const { error } = await (supabase as any).from("rcm_bed_assignments").insert({ ...bed, admission_id: selected.id });
    if (error) return toast.error(error.message);
    toast.success("Bed assigned");
    setShowBed(false); loadDetail(selected);
  };

  const requestLos = async () => {
    if (!selected) return;
    const { error } = await (supabase as any).from("rcm_los_extensions").insert({
      ...los, admission_id: selected.id, status: "submitted", requested_by: (await supabase.auth.getUser()).data.user?.id
    });
    if (error) return toast.error(error.message);
    toast.success("LOS extension submitted");
    setShowLos(false); loadDetail(selected);
  };

  const advance = async (stage: string) => {
    if (!selected) return;
    const { error } = await (supabase as any).rpc("rcm_advance_discharge", {
      _admission_id: selected.id, _stage: stage, _notes: null
    });
    if (error) return toast.error(error.message);
    toast.success(`Stage logged · ${stage}`);
    load(); loadDetail(selected);
  };

  return (
    <div className="grid md:grid-cols-[340px_1fr] gap-4">
      {/* Admissions list */}
      <aside className="rounded-xl p-3 bg-slate-900/40 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Admissions ({admissions.length})</h3>
          <button onClick={() => setShowNew(s => !s)} className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1">
            <Plus size={12} /> New
          </button>
        </div>

        {showNew && (
          <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 mb-3">
            <select className={inputCls} value={na.admission_type} onChange={e => setNa({ ...na, admission_type: e.target.value })}>
              {ADM_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
            <input className={inputCls} placeholder="Patient device id *" value={na.patient_device_id} onChange={e => setNa({ ...na, patient_device_id: e.target.value })} />
            <input className={inputCls} placeholder="Attending physician" value={na.attending_name} onChange={e => setNa({ ...na, attending_name: e.target.value })} />
            <input className={inputCls} placeholder="Specialty" value={na.specialty} onChange={e => setNa({ ...na, specialty: e.target.value })} />
            <input className={inputCls} placeholder="Ward" value={na.ward} onChange={e => setNa({ ...na, ward: e.target.value })} />
            <input type="number" min={1} className={inputCls} placeholder="Planned LOS (days)" value={na.planned_los_days} onChange={e => setNa({ ...na, planned_los_days: e.target.value })} />
            <button onClick={create} className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Admit patient</button>
          </div>
        )}

        {loading ? <p className="text-xs text-slate-500">Loading…</p>
          : admissions.length === 0 ? <p className="text-xs text-slate-500">No admissions yet.</p>
          : <div className="space-y-1.5">
              {admissions.map(a => (
                <button key={a.id} onClick={() => loadDetail(a)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors ${selected?.id === a.id ? "border-amber-500/50 bg-amber-500/5" : "border-slate-800 hover:border-slate-700"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-slate-300">{a.admission_no}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[a.status] || "bg-slate-700 text-slate-200"}`}>{a.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{a.admission_type} · LOS {a.actual_los_days ?? a.planned_los_days}d</p>
                  <p className="text-[11px] text-slate-600 truncate">{a.attending_name} · {a.specialty}</p>
                </button>
              ))}
            </div>}
      </aside>

      {/* Detail */}
      <section className="rounded-xl p-4 bg-slate-900/40 border border-slate-800 min-h-[400px]">
        {!selected ? <p className="text-sm text-slate-500">Select an admission to view detail.</p>
          : <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-lg font-mono text-slate-100">{selected.admission_no}</p>
                <p className="text-xs text-slate-500">Admitted {new Date(selected.admitted_at).toLocaleString()}</p>
                <p className="text-xs text-slate-500">{selected.attending_name} · {selected.specialty}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLORS[selected.status] || ""}`}>{selected.status}</span>
            </div>

            {/* Discharge stage stepper */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {STAGES.map(s => {
                const Icon = s.icon;
                const done = steps.some(x => x.stage === s.v);
                return (
                  <button key={s.v} onClick={() => advance(s.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${done ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                    <Icon size={12} /> {s.l} {done && "✓"}
                  </button>
                );
              })}
            </div>

            {/* Beds */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"><BedDouble size={13} /> Bed history ({beds.length})</h4>
                <button onClick={() => setShowBed(s => !s)} className="text-xs text-amber-400">+ Assign bed</button>
              </div>
              {showBed && (
                <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 mb-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inputCls} placeholder="Ward" value={bed.ward} onChange={e => setBed({ ...bed, ward: e.target.value })} />
                    <input className={inputCls} placeholder="Room #" value={bed.room_no} onChange={e => setBed({ ...bed, room_no: e.target.value })} />
                    <input className={inputCls} placeholder="Bed #" value={bed.bed_no} onChange={e => setBed({ ...bed, bed_no: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select className={inputCls} value={bed.room_type} onChange={e => setBed({ ...bed, room_type: e.target.value })}>
                      {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input type="number" className={inputCls} placeholder="Daily rate (SAR)" value={bed.daily_rate} onChange={e => setBed({ ...bed, daily_rate: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <button onClick={addBed} className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Save assignment</button>
                </div>
              )}
              <div className="space-y-1">
                {beds.map(b => (
                  <div key={b.id} className="text-xs p-2 rounded border border-slate-800 bg-slate-900/40 flex justify-between">
                    <span>{b.ward} · {b.room_no}/{b.bed_no} · {b.room_type}</span>
                    <span className="text-slate-500">{new Date(b.check_in_at).toLocaleDateString()} {b.check_out_at ? `→ ${new Date(b.check_out_at).toLocaleDateString()}` : "(current)"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* LOS extensions */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"><Clock size={13} /> LOS extensions ({losExt.length})</h4>
                <button onClick={() => setShowLos(s => !s)} className="text-xs text-amber-400">+ Request extension</button>
              </div>
              {showLos && (
                <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 mb-2">
                  <input type="number" min={1} className={inputCls} placeholder="Extra days" value={los.requested_extra_days} onChange={e => setLos({ ...los, requested_extra_days: parseInt(e.target.value) || 1 })} />
                  <textarea className={inputCls} placeholder="Clinical justification" value={los.clinical_justification} onChange={e => setLos({ ...los, clinical_justification: e.target.value })} />
                  <button onClick={requestLos} className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold">Submit</button>
                </div>
              )}
              <div className="space-y-1">
                {losExt.map(l => (
                  <div key={l.id} className="text-xs p-2 rounded border border-slate-800 bg-slate-900/40">
                    <div className="flex justify-between">
                      <span>+{l.requested_extra_days}d {l.approved_extra_days != null && `(approved ${l.approved_extra_days}d)`}</span>
                      <span className="text-slate-500">{l.status}</span>
                    </div>
                    {l.clinical_justification && <p className="text-slate-500 mt-0.5">{l.clinical_justification}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Discharge timeline */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2">Discharge timeline</h4>
              <div className="space-y-1">
                {steps.length === 0 ? <p className="text-xs text-slate-500">No discharge stages logged.</p>
                  : steps.map(s => (
                    <div key={s.id} className="text-xs p-2 rounded border border-slate-800 bg-slate-900/40 flex justify-between">
                      <span className="font-medium text-slate-200">{s.stage}</span>
                      <span className="text-slate-500">{new Date(s.occurred_at).toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          </>}
      </section>
    </div>
  );
};

export default RcmIpDcWorklist;
