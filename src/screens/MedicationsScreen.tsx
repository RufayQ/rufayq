import { useState } from "react";
import { medications, type Medication } from "@/constants/data";
import { ArrowLeft, Plus, X, Copy } from "lucide-react";
import { toast } from "sonner";

interface MedicationsScreenProps {
  onBack: () => void;
}

const MedicationsScreen = ({ onBack }: MedicationsScreenProps) => {
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());

  const statusColor = (s: string) =>
    s === "taken" ? "var(--success)" : s === "due" ? "var(--warning)" : s === "missed" ? "var(--error)" : "var(--gray)";

  const statusLabel = (s: string) =>
    s === "taken" ? "TAKEN ✓" : s === "due" ? "DUE" : s === "missed" ? "MISSED ✗" : "UPCOMING";


  const periods = [
    { key: "morning", label: "Morning", time: "8:00 AM — 12:00 PM", color: "var(--success)" },
    { key: "afternoon", label: "Afternoon", time: "12:00 PM — 6:00 PM", color: "var(--teal-deep)" },
    { key: "evening", label: "Evening", time: "6:00 PM — 10:00 PM", color: "var(--warning)" },
  ];

  const takenCount = medications.filter((m) => m.status === "taken").length + takenIds.size;

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-5 pt-3 pb-4" style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="btn-press"><ArrowLeft size={20} color="white" /></button>
          <p className="font-display text-lg text-white">Medications · <span className="font-arabic">الأدوية</span></p>
          <Plus size={20} color="white" className="cursor-pointer" />
        </div>
        <div className="flex gap-2">
          {[`${medications.length} Medications`, "Next Due: 8PM", `${takenCount}/${medications.length} Taken`].map((s) => (
            <span key={s} className="font-mono text-[9px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ background: "var(--off-white)" }}>
        <p className="font-mono text-[10px] tracking-widest mt-3 mb-2" style={{ color: "var(--gray)" }}>TODAY'S SCHEDULE</p>

        {periods.map((period) => {
          const meds = medications.filter((m) => m.period === period.key);
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
                  const key = `${med.name}-${med.time}`;
                  const isTaken = med.status === "taken" || takenIds.has(key);
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
                          <p className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>{med.frequency}</p>
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
        <div className="absolute inset-0 z-20 flex flex-col justify-end" onClick={() => setSelectedMed(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
          <div className="relative rounded-t-2xl p-5 pt-3 animate-slide-up overflow-y-auto" style={{ background: "var(--white)", maxHeight: "85%" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--gray-light)" }} />

            <div className="text-center mb-4">
              <span className="text-4xl">💊</span>
              <p className="font-display text-2xl mt-2" style={{ color: "var(--navy)" }}>{selectedMed.name}</p>
              <p className="font-arabic text-base" dir="rtl" style={{ color: "var(--gray)" }}>{selectedMed.nameAr}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "DOSE", value: selectedMed.dosage },
                { label: "FREQUENCY", value: selectedMed.frequency },
                { label: "TIME", value: selectedMed.time },
                { label: "WITH FOOD?", value: "Yes" },
              ].map((d) => (
                <div key={d.label} className="rounded-lg p-3" style={{ background: "var(--off-white)" }}>
                  <p className="font-mono text-[9px] tracking-wider" style={{ color: "var(--gray)" }}>{d.label}</p>
                  <p className="text-[13px] font-medium mt-0.5" style={{ color: "var(--navy)" }}>{d.value}</p>
                </div>
              ))}
            </div>

            {selectedMed.instructions && (
              <div className="rounded-xl p-3 mb-3" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <p className="text-xs" style={{ color: "var(--navy)" }}>⚠️ {selectedMed.instructions}</p>
                {selectedMed.instructionsAr && <p className="font-arabic text-[11px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>{selectedMed.instructionsAr}</p>}
              </div>
            )}

            {selectedMed.redFlags && (
              <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(217,79,79,0.05)", border: "1px solid var(--error)" }}>
                <p className="text-xs" style={{ color: "var(--error)" }}>🚨 {selectedMed.redFlags}</p>
                {selectedMed.redFlagsAr && <p className="font-arabic text-[11px] mt-1" dir="rtl" style={{ color: "var(--error)" }}>{selectedMed.redFlagsAr}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const lines = [
                    `💊 ${selectedMed.name} (${selectedMed.nameAr})`,
                    `Dose: ${selectedMed.dosage}`,
                    `Frequency: ${selectedMed.frequency}`,
                    `Time: ${selectedMed.time}`,
                    selectedMed.instructions ? `⚠️ ${selectedMed.instructions}` : "",
                    selectedMed.redFlags ? `🚨 ${selectedMed.redFlags}` : "",
                  ].filter(Boolean).join("\n");
                  navigator.clipboard.writeText(lines).then(() => toast.success("Medication info copied · تم نسخ معلومات الدواء"));
                }}
                className="py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 btn-press"
                style={{ border: "1px solid var(--gray-light)", color: "var(--navy)" }}
              >
                <Copy size={15} /> Copy Info
              </button>
              <button
                onClick={() => {
                  const key = `${selectedMed.name}-${selectedMed.time}`;
                  setTakenIds((prev) => new Set(prev).add(key));
                  setSelectedMed(null);
                }}
                className="py-3.5 rounded-xl font-semibold text-white btn-press"
                style={{ background: "var(--success)" }}
              >
                Taken ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationsScreen;
