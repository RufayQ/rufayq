import { useState, useEffect, useMemo } from "react";
import { medications as demoMedications, type Medication } from "@/constants/data";
import { ArrowLeft, Plus, Copy, Share2, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import HeaderMenu, { type HeaderMenuItem } from "@/components/HeaderMenu";
import MedicationDetailSheet, { type MedNote } from "@/components/MedicationDetailSheet";
import AddMedicationSheet from "@/components/AddMedicationSheet";
import ProviderFeedCard from "@/components/ProviderFeedCard";
import { useProviderFeed } from "@/hooks/useProviderFeed";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useGuestCategories } from "@/hooks/useGuestCategories";
import { useMedications } from "@/hooks/useMedications";
import { supabase } from "@/integrations/supabase/client";
import type { MedicationRow } from "@/lib/api/medicationApi";

interface MedicationsScreenProps {
  onBack: () => void;
  onConsultAI?: (medContext: string) => void;
}

/** Map a DB MedicationRow into the UI Medication shape used across this screen. */
function rowToMedication(r: MedicationRow): Medication {
  const freq = (r.frequency || "Once daily").toString();
  const lower = freq.toLowerCase();
  let period: Medication["period"] = "morning";
  if (lower.includes("evening") || lower.includes("night") || lower.includes("pm")) period = "evening";
  else if (lower.includes("afternoon") || lower.includes("noon")) period = "afternoon";
  let time = "08:00 AM";
  const rt = Array.isArray(r.reminder_times) ? (r.reminder_times as unknown[]) : [];
  const first = rt[0];
  if (typeof first === "string" && /^\d{1,2}:\d{2}/.test(first)) {
    const [hStr, mStr] = first.split(":");
    const h = Number(hStr);
    const m = Number(mStr) || 0;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    time = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    if (h >= 18) period = "evening";
    else if (h >= 12) period = "afternoon";
    else period = "morning";
  }
  return {
    name: r.medication_name,
    nameAr: r.medication_name,
    dosage: r.dose || "",
    time,
    frequency: freq,
    status: "upcoming",
    period,
    instructions: r.instructions || undefined,
  };
}

/** Convert a UI-entered Medication into a MedicationRow partial for save(). */
function medicationToRowInput(m: Medication): Partial<MedicationRow> {
  // parse "h:mm AM/PM" → "HH:MM"
  let hhmm: string | null = null;
  const match = m.time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let h = Number(match[1]);
    const min = Number(match[2]);
    const ap = (match[3] || "").toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    hhmm = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  return {
    medication_name: m.name,
    dose: m.dosage || null,
    frequency: m.frequency || null,
    instructions: m.instructions || null,
    reminder_times: hhmm ? [hhmm] : [],
  };
}

const MedicationsScreen = ({ onBack, onConsultAI }: MedicationsScreenProps) => {
  const isGuest = useGuestMode();
  const { categories: guestCats } = useGuestCategories();

  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsAuthed(!!data.session?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setIsAuthed(!!s?.user);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const realMeds = useMedications();

  const showMedsDemo = !isAuthed && isGuest && guestCats.meds;
  const demo: Medication[] = showMedsDemo ? demoMedications : [];

  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());
  const [medNotes, setMedNotes] = useState<Record<string, MedNote[]>>({});
  const [medReminders, setMedReminders] = useState<Record<string, number[]>>({});
  const [allergies] = useState<string[]>(showMedsDemo ? ["Penicillin", "Sulfa drugs", "Shellfish"] : []);
  const [extraMeds, setExtraMeds] = useState<Medication[]>([]);
  const [showAddMed, setShowAddMed] = useState(false);
  const { medUpdates } = useProviderFeed();

  const realAsUi = useMemo(
    () => (isAuthed ? realMeds.items.map(rowToMedication) : []),
    [isAuthed, realMeds.items],
  );
  const allMeds: Medication[] = isAuthed ? realAsUi : [...demo, ...extraMeds];


  const actionLabel = (a: string) => a === "add" ? "PRESCRIBED" : a === "stop" ? "STOPPED" : "UPDATED";
  const actionColor = (a: string) => a === "stop" ? "rgba(217,79,79,0.15)" : a === "add" ? "rgba(61,170,110,0.15)" : "rgba(224,160,48,0.15)";

  const medKey = (m: Medication) => `${m.name}-${m.time}`;

  const statusColor = (s: string) =>
    s === "taken" ? "var(--success)" : s === "due" ? "var(--warning)" : s === "missed" ? "var(--error)" : "var(--gray)";

  const statusLabel = (s: string) =>
    s === "taken" ? "TAKEN ✓" : s === "due" ? "DUE" : s === "missed" ? "MISSED ✗" : "UPCOMING";

  const periods = [
    { key: "morning", label: "Morning", time: "8:00 AM — 12:00 PM", color: "var(--success)" },
    { key: "afternoon", label: "Afternoon", time: "12:00 PM — 6:00 PM", color: "var(--teal-deep)" },
    { key: "evening", label: "Evening", time: "6:00 PM — 10:00 PM", color: "var(--warning)" },
  ];

  const takenCount = allMeds.filter((m) => m.status === "taken").length + takenIds.size;

  const handleCopyAllMeds = () => {
    const text = medications.map(m =>
      `💊 ${m.name} (${m.nameAr}) — ${m.dosage} — ${m.frequency} — ${m.time}`
    ).join("\n");
    navigator.clipboard.writeText(`Medication Schedule\nجدول الأدوية\n\n${text}`);
    toast.success("All medications copied · تم نسخ جميع الأدوية", { duration: 2000 });
  };

  const handleExportMeds = () => {
    const text = medications.map(m =>
      `${m.name}\t${m.nameAr}\t${m.dosage}\t${m.frequency}\t${m.time}\t${m.status}`
    ).join("\n");
    const blob = new Blob([`Name\tName (AR)\tDosage\tFrequency\tTime\tStatus\n${text}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "medications-schedule.txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Medications exported · تم تصدير الأدوية", { duration: 2000 });
  };

  const handleShareMeds = () => {
    const text = `Medication Schedule\nجدول الأدوية\n\n${medications.map(m => `💊 ${m.name} — ${m.dosage} — ${m.time}`).join("\n")}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleResetTaken = () => {
    setTakenIds(new Set());
    toast.success("Reset today's tracking · تم إعادة التتبع", { duration: 2000 });
  };

  const medsMenuItems: HeaderMenuItem[] = [
    { icon: <Copy size={14} />, label: "Copy All Meds", labelAr: "نسخ جميع الأدوية", onClick: handleCopyAllMeds },
    { icon: <Download size={14} />, label: "Export Schedule", labelAr: "تصدير الجدول", onClick: handleExportMeds },
    { icon: <Share2 size={14} />, label: "Share with Doctor", labelAr: "مشاركة مع الطبيب", onClick: handleShareMeds },
    { icon: <RefreshCw size={14} />, label: "Reset Today", labelAr: "إعادة تتبع اليوم", onClick: handleResetTaken },
  ];

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-5 pt-3 pb-4" style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="btn-press"><ArrowLeft size={20} color="white" /></button>
          <p className="font-display text-lg text-white">Medications · <span className="font-arabic">الأدوية</span></p>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddMed(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold btn-press" style={{ background: "var(--gold)", color: "white" }}>
              <Plus size={12} /> Add
            </button>
            <HeaderMenu items={medsMenuItems} />
          </div>
        </div>
        <div className="flex gap-2">
          {[`${allMeds.length} Medications`, "Next Due: 8PM", `${takenCount}/${allMeds.length} Taken`].map((s) => (
            <span key={s} className="font-mono text-[9px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Allergies banner */}
      {allergies.length > 0 && <div className="mx-4 mt-3 rounded-xl p-3 flex items-start gap-2.5" style={{ background: "rgba(217,79,79,0.06)", border: "1px solid rgba(217,79,79,0.25)" }}>
        <span className="text-base">⚠️</span>
        <div className="flex-1">
          <p className="text-[11px] font-bold" style={{ color: "var(--error)" }}>YOUR ALLERGIES<span className="font-arabic" dir="rtl"> · حساسياتك</span></p>
          <div className="flex flex-wrap gap-1 mt-1">
            {allergies.map((a) => (
              <span key={a} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--white)", color: "var(--error)", border: "1px solid var(--error)" }}>
                {a}
              </span>
            ))}
          </div>
          <p className="font-arabic text-[10px] mt-1" dir="rtl" style={{ color: "var(--error)" }}>تأكد من خلو أدويتك من هذه المواد</p>
        </div>
      </div>}

      {/* Schedule */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ background: "var(--off-white)" }}>
        {medUpdates.length > 0 && (
          <div className="mt-3">
            <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>
              FROM YOUR CARE TEAM · <span className="font-arabic">من فريق الرعاية</span>
            </p>
            {medUpdates.slice(0, 5).map(m => (
              <ProviderFeedCard
                key={m.id}
                orgName={m.org_name}
                title={m.med_name}
                body={[m.dose, m.frequency, m.notes].filter(Boolean).join(" · ")}
                createdAt={m.created_at}
                badge={actionLabel(m.action)}
                badgeColor={actionColor(m.action)}
              />
            ))}
          </div>
        )}
        <p className="font-mono text-[10px] tracking-widest mt-3 mb-2" style={{ color: "var(--gray)" }}>TODAY'S SCHEDULE</p>

        {periods.map((period) => {
          const meds = allMeds.filter((m) => m.period === period.key);
          if (meds.length === 0) return null;
          return (
            <div key={period.key} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: period.color }} />
                <span className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{period.label}</span>
                <span className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{period.time}</span>
              </div>
              <div className="space-y-2 pl-3" style={{ borderLeft: `2px dashed var(--gray-light)` }}>
                {meds.map((med, i) => {
                  const key = medKey(med);
                  const isTaken = med.status === "taken" || takenIds.has(key);
                  const noteCount = (medNotes[key] || []).length;
                  const reminderCount = (medReminders[key] || []).length;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-mono text-[11px] w-14 shrink-0" style={{ color: "var(--gray)" }}>{med.time}</span>
                      <button
                        onClick={() => setSelectedMed(med)}
                        className="flex-1 flex items-center gap-3 rounded-xl p-3 card-press"
                        style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: statusColor(isTaken ? "taken" : med.status) }} />
                        <div className="flex-1 text-left">
                          <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{med.name}</p>
                          <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{med.nameAr}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{med.frequency}</p>
                            {noteCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--gold-pale)", color: "var(--gold)" }}>📝 {noteCount}</span>}
                            {reminderCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>⏰ {reminderCount}</span>}
                          </div>
                        </div>
                        <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
                          color: isTaken ? "var(--success)" : med.status === "due" ? "var(--warning)" : "var(--gray)",
                          background: isTaken ? "rgba(61,170,110,0.1)" : med.status === "due" ? "rgba(224,160,48,0.1)" : "var(--off-white)",
                        }}>
                          {isTaken ? "TAKEN ✓" : statusLabel(med.status)}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Medication Detail Sheet */}
      {selectedMed && (
        <MedicationDetailSheet
          med={selectedMed}
          onClose={() => setSelectedMed(null)}
          isTaken={selectedMed.status === "taken" || takenIds.has(medKey(selectedMed))}
          onMarkTaken={() => {
            const key = medKey(selectedMed);
            setTakenIds((prev) => new Set(prev).add(key));
          }}
          notes={medNotes[medKey(selectedMed)] || []}
          onSaveNotes={(notes) => setMedNotes((prev) => ({ ...prev, [medKey(selectedMed)]: notes }))}
          reminders={medReminders[medKey(selectedMed)] || []}
          onToggleReminder={(minutes) => {
            const key = medKey(selectedMed);
            setMedReminders((prev) => {
              const current = prev[key] || [];
              return { ...prev, [key]: current.includes(minutes) ? current.filter((m) => m !== minutes) : [...current, minutes] };
            });
          }}
          allergies={allergies}
          onConsultAI={(med) => {
            const ctx = `Please explain my medication: ${med.name} (${med.nameAr}). Dose: ${med.dosage}. Frequency: ${med.frequency}. Time: ${med.time}.${med.instructions ? ` Instructions: ${med.instructions}` : ""}${allergies.length ? ` My allergies: ${allergies.join(", ")}.` : ""}`;
            onConsultAI?.(ctx);
          }}
        />
      )}

      <AddMedicationSheet
        open={showAddMed}
        onClose={() => setShowAddMed(false)}
        onSubmit={(med) => setExtraMeds(prev => [...prev, med])}
        allergies={allergies}
      />
    </div>
  );
};

export default MedicationsScreen;
