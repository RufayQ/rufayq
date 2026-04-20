import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LogOut, Users, FileText, Pill, Calendar, Plus, Send, Building2, Search,
} from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";
import PatientSearch from "@/components/provider/PatientSearch";

interface Org { id: string; name: string; org_type: string; }
interface Patient {
  id: string; patient_device_id: string; patient_name: string | null;
  patient_email: string | null; patient_phone: string | null; status: string; notes: string | null;
}

type Tab = "patients" | "find" | "instructions" | "medications" | "appointments";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [tab, setTab] = useState<Tab>("patients");

  // Add-patient form
  const [showAdd, setShowAdd] = useState(false);
  const [newPatient, setNewPatient] = useState({ device_id: "", name: "", email: "", phone: "", notes: "" });

  // Instruction form
  const [instr, setInstr] = useState({ title: "", body: "", body_ar: "", priority: "normal" });
  // Medication form
  const [med, setMed] = useState({ action: "add", med_name: "", dose: "", frequency: "", notes: "" });
  // Appointment form
  const [appt, setAppt] = useState({ title: "", location: "", scheduled_at: "", notes: "" });

  // History
  const [history, setHistory] = useState<{ instructions: any[]; meds: any[]; appts: any[] }>({ instructions: [], meds: [], appts: [] });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/provider/login", { replace: true }); return; }
      setUser({ id: session.user.id, email: session.user.email || "" });

      const { data: members } = await supabase
        .from("provider_members")
        .select("organization_id, organizations(id, name, org_type)")
        .eq("user_id", session.user.id)
        .eq("is_active", true);
      const orgList: Org[] = (members || []).map((m: any) => m.organizations).filter(Boolean);
      if (orgList.length === 0) {
        toast.error("No active provider memberships found.");
        await supabase.auth.signOut();
        navigate("/provider/login", { replace: true });
        return;
      }
      setOrgs(orgList);
      setActiveOrg(orgList[0].id);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      const { data } = await supabase.from("provider_patients").select("*").eq("organization_id", activeOrg).order("created_at", { ascending: false });
      setPatients((data as Patient[]) || []);
    })();
  }, [activeOrg]);

  useEffect(() => {
    if (!selectedPatient || !activeOrg) { setHistory({ instructions: [], meds: [], appts: [] }); return; }
    (async () => {
      const [{ data: ins }, { data: meds }, { data: ap }] = await Promise.all([
        supabase.from("provider_instructions").select("*").eq("organization_id", activeOrg).eq("patient_device_id", selectedPatient.patient_device_id).order("created_at", { ascending: false }),
        supabase.from("provider_medication_updates").select("*").eq("organization_id", activeOrg).eq("patient_device_id", selectedPatient.patient_device_id).order("created_at", { ascending: false }),
        supabase.from("provider_appointments").select("*").eq("organization_id", activeOrg).eq("patient_device_id", selectedPatient.patient_device_id).order("scheduled_at", { ascending: false }),
      ]);
      setHistory({ instructions: ins || [], meds: meds || [], appts: ap || [] });
    })();
  }, [selectedPatient, activeOrg]);

  const logout = async () => { await supabase.auth.signOut(); navigate("/provider/login", { replace: true }); };

  const addPatient = async () => {
    if (!activeOrg || !newPatient.device_id.trim()) { toast.error("Patient device ID required"); return; }
    const { error } = await supabase.from("provider_patients").insert({
      organization_id: activeOrg,
      patient_device_id: newPatient.device_id.trim(),
      patient_name: newPatient.name || null,
      patient_email: newPatient.email || null,
      patient_phone: newPatient.phone || null,
      notes: newPatient.notes || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Patient linked");
    setShowAdd(false); setNewPatient({ device_id: "", name: "", email: "", phone: "", notes: "" });
    const { data } = await supabase.from("provider_patients").select("*").eq("organization_id", activeOrg).order("created_at", { ascending: false });
    setPatients((data as Patient[]) || []);
  };

  const sendInstruction = async () => {
    if (!selectedPatient || !activeOrg || !instr.title.trim() || !instr.body.trim()) { toast.error("Title and body required"); return; }
    const { error } = await supabase.from("provider_instructions").insert({
      organization_id: activeOrg, patient_device_id: selectedPatient.patient_device_id,
      author_id: user?.id, ...instr,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Instruction sent — patient will be notified");
    setInstr({ title: "", body: "", body_ar: "", priority: "normal" });
    const { data } = await supabase.from("provider_instructions").select("*").eq("organization_id", activeOrg).eq("patient_device_id", selectedPatient.patient_device_id).order("created_at", { ascending: false });
    setHistory(h => ({ ...h, instructions: data || [] }));
  };

  const sendMed = async () => {
    if (!selectedPatient || !activeOrg || !med.med_name.trim()) { toast.error("Medication name required"); return; }
    const { error } = await supabase.from("provider_medication_updates").insert({
      organization_id: activeOrg, patient_device_id: selectedPatient.patient_device_id,
      author_id: user?.id, ...med,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Medication update pushed to patient");
    setMed({ action: "add", med_name: "", dose: "", frequency: "", notes: "" });
    const { data } = await supabase.from("provider_medication_updates").select("*").eq("organization_id", activeOrg).eq("patient_device_id", selectedPatient.patient_device_id).order("created_at", { ascending: false });
    setHistory(h => ({ ...h, meds: data || [] }));
  };

  const sendAppt = async () => {
    if (!selectedPatient || !activeOrg || !appt.title.trim() || !appt.scheduled_at) { toast.error("Title and date required"); return; }
    const { error } = await supabase.from("provider_appointments").insert({
      organization_id: activeOrg, patient_device_id: selectedPatient.patient_device_id,
      author_id: user?.id, title: appt.title, location: appt.location || null,
      scheduled_at: new Date(appt.scheduled_at).toISOString(), notes: appt.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment scheduled — patient will be notified");
    setAppt({ title: "", location: "", scheduled_at: "", notes: "" });
    const { data } = await supabase.from("provider_appointments").select("*").eq("organization_id", activeOrg).eq("patient_device_id", selectedPatient.patient_device_id).order("scheduled_at", { ascending: false });
    setHistory(h => ({ ...h, appts: data || [] }));
  };

  const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.18)";
  const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)", GOLD = "#C5965A", TEAL = "#0FB5C9";

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "patients", label: "Patients", icon: Users },
    { id: "find", label: "Find Patient", icon: Search },
    { id: "instructions", label: "Instructions", icon: FileText },
    { id: "medications", label: "Medications", icon: Pill },
    { id: "appointments", label: "Appointments", icon: Calendar },
  ];

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const inputStyle = { background: BG, border: `1px solid ${BORDER}`, color: TEXT };

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }}>
      <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: "rgba(6,16,26,0.85)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RufayQLogo size={32} variant="light" />
            <div>
              <p className="font-display text-lg leading-tight">Provider Portal</p>
              <p className="text-[10px]" style={{ color: MUTED }}>{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {orgs.length > 1 && (
              <select value={activeOrg || ""} onChange={e => setActiveOrg(e.target.value)} className="text-xs px-3 py-1.5 rounded-full" style={{ background: BG2, border: `1px solid ${BORDER}`, color: TEXT }}>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
            <span className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
              <Building2 size={12} color={GOLD} /> {orgs.find(o => o.id === activeOrg)?.name}
            </span>
            <button onClick={logout} className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: "rgba(233,69,96,0.15)", color: "#E94560" }}>
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all"
                style={{ color: tab === t.id ? GOLD : MUTED, borderBottom: `2px solid ${tab === t.id ? GOLD : "transparent"}` }}>
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {tab === "find" ? (
          <div className="max-w-2xl mx-auto">
            {activeOrg && <PatientSearch organizationId={activeOrg} />}
            <p className="text-xs mt-4 text-center" style={{ color: MUTED }}>
              Submitted claims appear in the admin Patient Claims queue. Once admin and patient both approve, the patient will appear in your Patients list.
            </p>
          </div>
        ) : (
        <div className="grid md:grid-cols-[300px_1fr] gap-6">
        {/* Patient list */}
        <aside className="rounded-2xl p-4" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">Patients ({patients.length})</p>
            <button onClick={() => setShowAdd(s => !s)} className="p-1.5 rounded-full" style={{ background: GOLD, color: BG }}>
              <Plus size={14} />
            </button>
          </div>

          {showAdd && (
            <div className="space-y-2 mb-3 p-3 rounded-xl" style={{ background: BG, border: `1px dashed ${BORDER}` }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: GOLD }}>Link a patient</p>
              <input className={inputCls} style={inputStyle} placeholder="Patient device ID *" value={newPatient.device_id} onChange={e => setNewPatient(p => ({ ...p, device_id: e.target.value }))} />
              <input className={inputCls} style={inputStyle} placeholder="Name" value={newPatient.name} onChange={e => setNewPatient(p => ({ ...p, name: e.target.value }))} />
              <input className={inputCls} style={inputStyle} placeholder="Email" value={newPatient.email} onChange={e => setNewPatient(p => ({ ...p, email: e.target.value }))} />
              <input className={inputCls} style={inputStyle} placeholder="Phone" value={newPatient.phone} onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value }))} />
              <button onClick={addPatient} className="w-full py-2 rounded-lg text-xs font-semibold" style={{ background: TEAL, color: "#fff" }}>Add patient</button>
              <p className="text-[10px]" style={{ color: MUTED }}>Tip: ask the patient for their device ID from the Settings → About screen.</p>
            </div>
          )}

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {patients.length === 0 && <p className="text-xs opacity-50 py-6 text-center">No patients linked yet</p>}
            {patients.map(p => (
              <button key={p.id} onClick={() => setSelectedPatient(p)}
                className="w-full text-left p-2.5 rounded-lg transition-all"
                style={{
                  background: selectedPatient?.id === p.id ? "rgba(197,150,90,0.15)" : "transparent",
                  border: `1px solid ${selectedPatient?.id === p.id ? GOLD : "transparent"}`,
                }}>
                <p className="text-sm font-medium truncate">{p.patient_name || "Unnamed"}</p>
                <p className="text-[10px] opacity-50 truncate">{p.patient_device_id}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* Detail */}
        <section className="rounded-2xl p-6" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          {!selectedPatient ? (
            <div className="text-center py-20 opacity-60">
              <Users size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select a patient from the list</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="font-display text-2xl" style={{ fontWeight: 300 }}>{selectedPatient.patient_name || "Unnamed patient"}</p>
                <p className="text-xs" style={{ color: MUTED }}>{selectedPatient.patient_email} · {selectedPatient.patient_phone}</p>
                <p className="text-[10px] mt-1 opacity-50">Device: {selectedPatient.patient_device_id}</p>
              </div>

              {tab === "patients" && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider" style={{ color: GOLD }}>Notes</p>
                  <p className="text-sm opacity-80 whitespace-pre-wrap">{selectedPatient.notes || "—"}</p>
                </div>
              )}

              {tab === "instructions" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl space-y-2" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                    <p className="text-xs uppercase tracking-wider" style={{ color: GOLD }}>Send new instruction</p>
                    <input className={inputCls} style={inputStyle} placeholder="Title" value={instr.title} onChange={e => setInstr(s => ({ ...s, title: e.target.value }))} />
                    <textarea className={inputCls} style={inputStyle} rows={3} placeholder="Body (English)" value={instr.body} onChange={e => setInstr(s => ({ ...s, body: e.target.value }))} />
                    <textarea className={inputCls} style={inputStyle} rows={2} dir="rtl" placeholder="النص بالعربية (اختياري)" value={instr.body_ar} onChange={e => setInstr(s => ({ ...s, body_ar: e.target.value }))} />
                    <select className={inputCls} style={inputStyle} value={instr.priority} onChange={e => setInstr(s => ({ ...s, priority: e.target.value }))}>
                      <option value="low">Low priority</option><option value="normal">Normal</option><option value="high">High priority</option>
                    </select>
                    <button onClick={sendInstruction} className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: GOLD, color: BG }}>
                      <Send size={12} /> Send & notify patient
                    </button>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: MUTED }}>History</p>
                    {history.instructions.length === 0 && <p className="text-xs opacity-40">None yet</p>}
                    {history.instructions.map((i: any) => (
                      <div key={i.id} className="p-3 rounded-lg mb-2" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                        <p className="text-sm font-semibold">{i.title}</p>
                        <p className="text-xs opacity-70 whitespace-pre-wrap">{i.body}</p>
                        <p className="text-[10px] opacity-40 mt-1">{new Date(i.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "medications" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl space-y-2" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                    <p className="text-xs uppercase tracking-wider" style={{ color: GOLD }}>Push medication update</p>
                    <select className={inputCls} style={inputStyle} value={med.action} onChange={e => setMed(s => ({ ...s, action: e.target.value }))}>
                      <option value="add">Add new</option><option value="update">Update existing</option><option value="stop">Stop</option>
                    </select>
                    <input className={inputCls} style={inputStyle} placeholder="Medication name *" value={med.med_name} onChange={e => setMed(s => ({ ...s, med_name: e.target.value }))} />
                    <input className={inputCls} style={inputStyle} placeholder="Dose (e.g., 500mg)" value={med.dose} onChange={e => setMed(s => ({ ...s, dose: e.target.value }))} />
                    <input className={inputCls} style={inputStyle} placeholder="Frequency (e.g., twice daily)" value={med.frequency} onChange={e => setMed(s => ({ ...s, frequency: e.target.value }))} />
                    <textarea className={inputCls} style={inputStyle} rows={2} placeholder="Notes" value={med.notes} onChange={e => setMed(s => ({ ...s, notes: e.target.value }))} />
                    <button onClick={sendMed} className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: GOLD, color: BG }}>
                      <Pill size={12} /> Push to patient app
                    </button>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: MUTED }}>History</p>
                    {history.meds.length === 0 && <p className="text-xs opacity-40">None yet</p>}
                    {history.meds.map((m: any) => (
                      <div key={m.id} className="p-3 rounded-lg mb-2" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                        <p className="text-sm font-semibold">{m.action.toUpperCase()} · {m.med_name}</p>
                        <p className="text-xs opacity-70">{m.dose} · {m.frequency}</p>
                        <p className="text-[10px] opacity-40 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "appointments" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl space-y-2" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                    <p className="text-xs uppercase tracking-wider" style={{ color: GOLD }}>Schedule appointment</p>
                    <input className={inputCls} style={inputStyle} placeholder="Title (e.g., Follow-up consultation)" value={appt.title} onChange={e => setAppt(s => ({ ...s, title: e.target.value }))} />
                    <input className={inputCls} style={inputStyle} placeholder="Location" value={appt.location} onChange={e => setAppt(s => ({ ...s, location: e.target.value }))} />
                    <input type="datetime-local" className={inputCls} style={inputStyle} value={appt.scheduled_at} onChange={e => setAppt(s => ({ ...s, scheduled_at: e.target.value }))} />
                    <textarea className={inputCls} style={inputStyle} rows={2} placeholder="Notes" value={appt.notes} onChange={e => setAppt(s => ({ ...s, notes: e.target.value }))} />
                    <button onClick={sendAppt} className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: GOLD, color: BG }}>
                      <Calendar size={12} /> Schedule & notify
                    </button>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-2" style={{ color: MUTED }}>History</p>
                    {history.appts.length === 0 && <p className="text-xs opacity-40">None yet</p>}
                    {history.appts.map((a: any) => (
                      <div key={a.id} className="p-3 rounded-lg mb-2" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                        <p className="text-sm font-semibold">{a.title}</p>
                        <p className="text-xs opacity-70">{a.location || "—"} · {new Date(a.scheduled_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ProviderDashboard;
