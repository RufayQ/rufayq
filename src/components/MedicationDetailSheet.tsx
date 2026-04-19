import { useState } from "react";
import { X, Copy, StickyNote, Bell, Clock, AlertTriangle, Plus, Trash2, Edit3, MessageCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import type { Medication } from "@/constants/data";

/* ─── Types ─── */
export interface MedNote {
  id: string;
  text: string;
  timestamp: string;
  source: "user" | "doctor";
}

export interface MedReminder {
  id: string;
  label: string;
  labelAr: string;
  minutesBefore: number;
  enabled: boolean;
  source: "system" | "user";
  icon: string;
}

const reminderOptions = [
  { label: "At dose time", value: 0, icon: "🔔" },
  { label: "15 min before", value: 15, icon: "⏰" },
  { label: "30 min before", value: 30, icon: "⏰" },
  { label: "1 hour before", value: 60, icon: "⏰" },
  { label: "2 hours before", value: 120, icon: "⏰" },
];

interface MedicationDetailSheetProps {
  med: Medication;
  onClose: () => void;
  onMarkTaken: () => void;
  isTaken: boolean;
  notes: MedNote[];
  onSaveNotes: (notes: MedNote[]) => void;
  reminders: number[];
  onToggleReminder: (minutes: number) => void;
  onConsultAI?: (med: Medication) => void;
  allergies?: string[];
}

const MedicationDetailSheet = ({
  med, onClose, onMarkTaken, isTaken,
  notes, onSaveNotes, reminders, onToggleReminder,
  onConsultAI, allergies = [],
}: MedicationDetailSheetProps) => {
  const [activeTab, setActiveTab] = useState<"details" | "safety" | "notes" | "reminders">("details");
  const [draftNote, setDraftNote] = useState("");
  const [noteSource, setNoteSource] = useState<"user" | "doctor">("user");

  const hasSafety = !!(med.precautions?.length || med.sideEffects?.length || med.contraindications?.length || med.interactions?.length);
  const tabs = [
    { key: "details" as const, label: "Details", icon: "💊" },
    { key: "safety" as const, label: "Safety", icon: "🛡️" },
    { key: "notes" as const, label: "Notes", icon: "📝" },
    { key: "reminders" as const, label: "Reminders", icon: "⏰" },
  ];

  const handleAddNote = () => {
    if (!draftNote.trim()) {
      toast.error("Please enter a note · الرجاء إدخال ملاحظة");
      return;
    }
    const newNote: MedNote = {
      id: `note-${Date.now()}`,
      text: draftNote.trim(),
      timestamp: new Date().toISOString(),
      source: noteSource,
    };
    onSaveNotes([...notes, newNote]);
    setDraftNote("");
    toast.success("Note added ✓ · تمت إضافة الملاحظة");
  };

  const handleDeleteNote = (id: string) => {
    onSaveNotes(notes.filter((n) => n.id !== id));
    toast.info("Note removed · تمت إزالة الملاحظة");
  };

  const handleCopyInfo = () => {
    const lines = [
      `💊 ${med.name} (${med.nameAr})`,
      `Dose: ${med.dosage}`,
      `Frequency: ${med.frequency}`,
      `Time: ${med.time}`,
      med.instructions ? `⚠️ ${med.instructions}` : "",
      med.redFlags ? `🚨 ${med.redFlags}` : "",
      notes.length > 0 ? `\nNotes:\n${notes.map((n) => `- ${n.text}`).join("\n")}` : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines).then(() =>
      toast.success("Medication info copied · تم نسخ معلومات الدواء")
    );
  };

  const statusColor = isTaken ? "var(--success)" : med.status === "due" ? "var(--warning)" : med.status === "missed" ? "var(--error)" : "var(--gray)";
  const statusLabel = isTaken ? "TAKEN ✓" : med.status === "due" ? "DUE" : med.status === "missed" ? "MISSED ✗" : "UPCOMING";

  return (
    <div className="absolute inset-0 z-[70] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
      <div
        className="relative animate-slide-up rounded-t-3xl overflow-y-auto"
        style={{ background: "var(--white)", maxHeight: "92%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-2 flex items-start justify-between">
          <div>
            <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>💊 MEDICATION DETAILS</p>
            <p className="font-display text-xl mt-0.5" style={{ color: "var(--navy)" }}>{med.name}</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>{med.nameAr}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[9px] font-bold px-2.5 py-1 rounded-full" style={{
              color: statusColor,
              background: isTaken ? "rgba(61,170,110,0.1)" : med.status === "due" ? "rgba(224,160,48,0.1)" : "var(--off-white)",
            }}>
              {statusLabel}
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#F0F2F5" }}>
              <X size={16} color="var(--gray)" />
            </button>
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex gap-1.5 px-5 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1 rounded-full transition-all"
              style={{
                height: 34,
                background: activeTab === tab.key ? "var(--teal-deep)" : "var(--off-white)",
                color: activeTab === tab.key ? "white" : "var(--gray)",
                fontSize: 11, fontWeight: 700,
                border: activeTab === tab.key ? "none" : "1px solid var(--gray-light)",
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className="px-5 pb-8">
          {/* ─── DETAILS TAB ─── */}
          {activeTab === "details" && (
            <div className="space-y-3 pt-2">
              {/* Pill image */}
              {med.imageUrl && (
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--gray-light)" }}>
                  <img src={med.imageUrl} alt={med.name} className="w-full h-40 object-cover" />
                </div>
              )}
              {/* Dosage info grid */}
              <div className="rounded-2xl p-4" style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.12)" }}>
                <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--teal-deep)" }}>DOSAGE INFORMATION</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "DOSE", value: med.dosage },
                    { label: "FREQUENCY", value: med.frequency },
                    { label: "TIME", value: med.time },
                    { label: "WITH FOOD", value: "Yes — recommended" },
                    { label: "ROUTE", value: med.name.includes("injection") || med.name.includes("Enoxaparin") ? "Subcutaneous" : "Oral" },
                    { label: "PERIOD", value: med.period.charAt(0).toUpperCase() + med.period.slice(1) },
                  ].map((d) => (
                    <div key={d.label}>
                      <p className="font-mono text-[8px] tracking-wider" style={{ color: "var(--gray)" }}>{d.label}</p>
                      <p className="text-[13px] font-medium mt-0.5" style={{ color: "var(--navy)" }}>{d.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {med.instructions && (
                <div className="rounded-xl p-3" style={{ background: "#FFFBEF", border: "1px solid rgba(197,150,90,0.3)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={12} color="var(--warning)" />
                    <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--warning)" }}>INSTRUCTIONS</p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--navy)" }}>⚠️ {med.instructions}</p>
                  {med.instructionsAr && <p className="font-arabic text-[11px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>{med.instructionsAr}</p>}
                </div>
              )}

              {/* Red flags */}
              {med.redFlags && (
                <div className="rounded-xl p-3" style={{ background: "rgba(217,79,79,0.05)", border: "1px solid var(--error)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={12} color="var(--error)" />
                    <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--error)" }}>RED FLAGS — STOP & CALL DOCTOR</p>
                  </div>
                  <p className="text-xs" style={{ color: "var(--error)" }}>🚨 {med.redFlags}</p>
                  {med.redFlagsAr && <p className="font-arabic text-[11px] mt-1" dir="rtl" style={{ color: "var(--error)" }}>{med.redFlagsAr}</p>}
                </div>
              )}

              {/* Notes preview */}
              {notes.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <StickyNote size={12} color="var(--gold)" />
                    <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>{notes.length} NOTE{notes.length > 1 ? "S" : ""}</p>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--navy)" }}>{notes[notes.length - 1].text}</p>
                </div>
              )}

              {/* Reminders preview */}
              {reminders.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: "var(--teal-light)", border: "1px solid rgba(0,77,91,0.12)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Bell size={12} color="var(--teal-deep)" />
                    <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>ACTIVE REMINDERS</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reminders.map((m) => {
                      const opt = reminderOptions.find((o) => o.value === m);
                      return (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid rgba(0,77,91,0.15)" }}>
                          {opt?.icon} {opt?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Allergies warning */}
              {allergies.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: "rgba(217,79,79,0.08)", border: "1px solid var(--error)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield size={12} color="var(--error)" />
                    <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--error)" }}>YOUR ALLERGIES — CHECK BEFORE TAKING</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map((a) => (
                      <span key={a} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--white)", color: "var(--error)", border: "1px solid var(--error)" }}>
                        ⚠️ {a}
                      </span>
                    ))}
                  </div>
                  <p className="font-arabic text-[10px] mt-2" dir="rtl" style={{ color: "var(--error)" }}>تحقق من الحساسية قبل تناول الدواء</p>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={handleCopyInfo} className="py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 btn-press" style={{ border: "1px solid var(--gray-light)", color: "var(--navy)" }}>
                  <Copy size={15} /> Copy Info
                </button>
                <button
                  onClick={() => { onMarkTaken(); onClose(); }}
                  disabled={isTaken}
                  className="py-3.5 rounded-xl font-semibold text-white btn-press disabled:opacity-50"
                  style={{ background: isTaken ? "var(--gray)" : "var(--success)" }}
                >
                  {isTaken ? "Already Taken" : "Taken ✓"}
                </button>
              </div>

              {/* Consult AI */}
              {onConsultAI && (
                <button
                  onClick={() => { onConsultAI(med); onClose(); }}
                  className="w-full mt-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 btn-press"
                  style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))", color: "white" }}
                >
                  <MessageCircle size={15} /> Consult RufayQ AI · <span className="font-arabic">استشر رُفَيِّق</span>
                </button>
              )}
            </div>
          )}

          {/* ─── SAFETY TAB ─── */}
          {activeTab === "safety" && (
            <div className="space-y-3 pt-2">
              {!hasSafety && (
                <div className="text-center py-8">
                  <span className="text-3xl">🛡️</span>
                  <p className="text-xs mt-2" style={{ color: "var(--gray)" }}>No safety info added yet · لم تُضف معلومات السلامة</p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--gray)" }}>Edit this medication to add precautions, side effects, contraindications and drug interactions.</p>
                </div>
              )}

              {med.precautions && med.precautions.length > 0 && (
                <SafetyBlock title="PRECAUTIONS · احتياطات" icon="⚠️" tone="warn" items={med.precautions} arItems={med.precautionsAr} />
              )}
              {med.sideEffects && med.sideEffects.length > 0 && (
                <SafetyBlock title="SIDE EFFECTS · آثار جانبية" icon="💢" tone="info" items={med.sideEffects} arItems={med.sideEffectsAr} />
              )}
              {med.contraindications && med.contraindications.length > 0 && (
                <SafetyBlock title="CONTRAINDICATIONS · موانع الاستعمال" icon="🚫" tone="error" items={med.contraindications} arItems={med.contraindicationsAr} />
              )}
              {med.interactions && med.interactions.length > 0 && (
                <SafetyBlock title="DRUG INTERACTIONS · تداخلات دوائية" icon="⚡" tone="error" items={med.interactions} arItems={med.interactionsAr} />
              )}

              {hasSafety && (
                <p className="text-[10px] text-center pt-2" style={{ color: "var(--gray)" }}>
                  Information shown is user-entered. Always verify with your treating physician.
                </p>
              )}
            </div>
          )}

          {/* ─── NOTES TAB ─── */}
          {activeTab === "notes" && (
            <div className="space-y-3 pt-2">
              {/* Add note form */}
              <div className="rounded-2xl p-4" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: "var(--gold)" }}>ADD A NOTE</p>

                {/* Source selector */}
                <div className="flex gap-2 mb-3">
                  {(["user", "doctor"] as const).map((src) => (
                    <button
                      key={src}
                      onClick={() => setNoteSource(src)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={{
                        background: noteSource === src ? (src === "doctor" ? "var(--teal-deep)" : "var(--navy)") : "var(--white)",
                        color: noteSource === src ? "white" : "var(--gray)",
                        border: noteSource === src ? "none" : "1px solid var(--gray-light)",
                      }}
                    >
                      {src === "user" ? "📝 My Note" : "👨‍⚕️ Doctor's Note"}
                    </button>
                  ))}
                </div>

                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  placeholder={noteSource === "doctor" ? "e.g. Reduce dose to 200mg after Day 5" : "e.g. Taking with breakfast works better"}
                  className="w-full rounded-xl p-3 text-[12px] resize-none"
                  style={{ background: "var(--white)", border: "1px solid var(--gray-light)", color: "var(--navy)", minHeight: 80 }}
                />

                <button
                  onClick={handleAddNote}
                  className="w-full mt-2 py-2.5 rounded-xl font-semibold text-white btn-press flex items-center justify-center gap-2"
                  style={{ background: "var(--teal-deep)" }}
                >
                  <Plus size={14} /> Add Note · إضافة ملاحظة
                </button>
              </div>

              {/* Existing notes */}
              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl">📝</span>
                  <p className="text-xs mt-2" style={{ color: "var(--gray)" }}>No notes yet · لا توجد ملاحظات</p>
                  <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>أضف ملاحظات شخصية أو توصيات الطبيب</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gray)" }}>{notes.length} NOTE{notes.length > 1 ? "S" : ""}</p>
                  {[...notes].reverse().map((note) => (
                    <div key={note.id} className="rounded-xl p-3 flex items-start gap-2" style={{
                      background: note.source === "doctor" ? "var(--teal-light)" : "#FFFBEF",
                      border: `1px solid ${note.source === "doctor" ? "rgba(0,77,91,0.12)" : "rgba(197,150,90,0.2)"}`,
                    }}>
                      <span className="text-sm mt-0.5">{note.source === "doctor" ? "👨‍⚕️" : "📝"}</span>
                      <div className="flex-1">
                        <p className="text-[12px] leading-relaxed" style={{ color: "var(--navy)" }}>{note.text}</p>
                        <p className="font-mono text-[9px] mt-1" style={{ color: "var(--gray)" }}>
                          {note.source === "doctor" ? "Doctor's note" : "Your note"} · {new Date(note.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteNote(note.id)} className="btn-press mt-1">
                        <Trash2 size={13} color="var(--error)" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── REMINDERS TAB ─── */}
          {activeTab === "reminders" && (
            <div className="space-y-3 pt-2">
              <div className="rounded-2xl p-4" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
                <p className="font-mono text-[9px] tracking-widest mb-3" style={{ color: "var(--teal-deep)" }}>DOSE REMINDERS</p>
                <p className="text-[11px] mb-3" style={{ color: "var(--gray)" }}>
                  Set reminders for {med.name} — {med.time}
                </p>

                <div className="space-y-2">
                  {reminderOptions.map((opt) => {
                    const active = reminders.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => onToggleReminder(opt.value)}
                        className="w-full flex items-center justify-between p-3 rounded-xl transition-all btn-press"
                        style={{
                          background: active ? "var(--teal-light)" : "var(--white)",
                          border: `1px solid ${active ? "rgba(0,77,91,0.2)" : "var(--gray-light)"}`,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{opt.icon}</span>
                          <span className="text-[12px] font-medium" style={{ color: active ? "var(--teal-deep)" : "var(--navy)" }}>{opt.label}</span>
                        </div>
                        <div className="w-10 h-5 rounded-full flex items-center transition-all px-0.5" style={{
                          background: active ? "var(--teal-deep)" : "var(--gray-light)",
                        }}>
                          <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-all" style={{
                            transform: active ? "translateX(20px)" : "translateX(0)",
                          }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {reminders.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: "#FFFBEF", border: "1px solid rgba(197,150,90,0.2)" }}>
                  <p className="text-[11px]" style={{ color: "var(--navy)" }}>
                    ✅ {reminders.length} reminder{reminders.length > 1 ? "s" : ""} active for this medication
                  </p>
                  <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>
                    {reminders.length} تنبيه{reminders.length > 1 ? "ات" : ""} مفعّل{reminders.length > 1 ? "ة" : ""} لهذا الدواء
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const toneStyles: Record<string, { bg: string; border: string; color: string }> = {
  warn: { bg: "#FFFBEF", border: "rgba(197,150,90,0.3)", color: "var(--warning)" },
  info: { bg: "var(--off-white)", border: "var(--gray-light)", color: "var(--teal-deep)" },
  error: { bg: "rgba(217,79,79,0.05)", border: "var(--error)", color: "var(--error)" },
};

const SafetyBlock = ({ title, icon, tone, items, arItems }: { title: string; icon: string; tone: "warn" | "info" | "error"; items: string[]; arItems?: string[] }) => {
  const t = toneStyles[tone];
  return (
    <div className="rounded-xl p-3" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: t.color }}>{icon} {title}</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-[12px] flex gap-1.5" style={{ color: "var(--navy)" }}>
            <span style={{ color: t.color }}>•</span>
            <span>{it}{arItems?.[i] ? <span className="font-arabic block text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>{arItems[i]}</span> : null}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MedicationDetailSheet;
