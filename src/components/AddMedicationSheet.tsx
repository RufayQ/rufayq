import { useState, useRef } from "react";
import { X, Pill, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Medication } from "@/constants/data";

interface AddMedicationSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (med: Medication) => void;
  allergies?: string[];
}

const periods: Medication["period"][] = ["morning", "afternoon", "evening"];
const periodLabel: Record<Medication["period"], { en: string; ar: string }> = {
  morning: { en: "Morning · 8AM", ar: "صباحاً" },
  afternoon: { en: "Afternoon · 2PM", ar: "ظهراً" },
  evening: { en: "Evening · 8PM", ar: "مساءً" },
};

const AddMedicationSheet = ({ open, onClose, onSubmit, allergies = [] }: AddMedicationSheetProps) => {
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("08:00");
  const [frequency, setFrequency] = useState("Once daily");
  const [period, setPeriod] = useState<Medication["period"]>("morning");
  const [instructions, setInstructions] = useState("");
  const [precautions, setPrecautions] = useState("");
  const [sideEffects, setSideEffects] = useState("");
  const [contraindications, setContraindications] = useState("");
  const [interactions, setInteractions] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large (max 2MB) · الصورة كبيرة جداً");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };
  const splitLines = (s: string) => s.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);

  if (!open) return null;

  const allergyHit = allergies.find(a => name.toLowerCase().includes(a.toLowerCase()));

  const reset = () => {
    setName(""); setNameAr(""); setDosage(""); setTime("08:00");
    setFrequency("Once daily"); setPeriod("morning"); setInstructions("");
    setPrecautions(""); setSideEffects(""); setContraindications(""); setInteractions(""); setImageUrl("");
  };

  const handleSubmit = () => {
    if (!name.trim() || !dosage.trim()) {
      toast.error("Name and dosage required · الاسم والجرعة مطلوبان");
      return;
    }
    if (allergyHit) {
      toast.error(`Allergy alert: contains ${allergyHit}`, { description: "Please confirm with your doctor first" });
      return;
    }
    const t12 = (() => {
      const [h, m] = time.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    })();
    const newMed: Medication = {
      name: name.trim(),
      nameAr: nameAr.trim() || name.trim(),
      dosage: dosage.trim(),
      time: t12,
      frequency,
      status: "upcoming",
      period,
      instructions: instructions.trim() || undefined,
      instructionsAr: instructions.trim() || undefined,
      precautions: splitLines(precautions).length ? splitLines(precautions) : undefined,
      sideEffects: splitLines(sideEffects).length ? splitLines(sideEffects) : undefined,
      contraindications: splitLines(contraindications).length ? splitLines(contraindications) : undefined,
      interactions: splitLines(interactions).length ? splitLines(interactions) : undefined,
      imageUrl: imageUrl || undefined,
    };
    onSubmit(newMed);
    toast.success("Medication added · تم إضافة الدواء");
    reset();
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        className="relative animate-slide-up rounded-t-3xl flex flex-col"
        style={{ background: "var(--white)", maxHeight: "85%" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 shrink-0">
          <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
          <div>
            <p className="font-display text-xl flex items-center gap-2" style={{ color: "var(--navy)" }}>
              <Pill size={18} style={{ color: "var(--teal-deep)" }} /> Add Medication
            </p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>إضافة دواء جديد</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--off-white)" }}>
            <X size={16} style={{ color: "var(--gray)" }} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-4 space-y-3" style={{ WebkitOverflowScrolling: "touch" }}>
          {/* Name */}
          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>NAME · الاسم</label>
            <input
              value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Paracetamol 500mg"
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: "var(--off-white)", border: `1px solid ${allergyHit ? "var(--error)" : "var(--gray-light)"}`, color: "var(--navy)" }}
            />
            {allergyHit && (
              <p className="text-[10px] mt-1" style={{ color: "var(--error)" }}>⚠️ Contains an allergen ({allergyHit}) — verify with doctor</p>
            )}
          </div>

          {/* Name AR */}
          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>NAME (AR) · بالعربية</label>
            <input
              value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="مثال: باراسيتامول ٥٠٠ ملغ" dir="rtl"
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none font-arabic"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
            />
          </div>

          {/* Dosage + Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>DOSE · الجرعة</label>
              <input
                value={dosage} onChange={e => setDosage(e.target.value)} placeholder="1 tablet"
                className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
                style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
              />
            </div>
            <div>
              <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>TIME · الوقت</label>
              <input
                type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
                style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>FREQUENCY · التكرار</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {["Once daily", "Every 8h", "Every 12h", "As needed"].map(f => (
                <button key={f} onClick={() => setFrequency(f)}
                  className="py-2 rounded-lg text-[12px] font-medium btn-press"
                  style={{
                    background: frequency === f ? "var(--teal-deep)" : "var(--off-white)",
                    color: frequency === f ? "white" : "var(--navy)",
                    border: frequency === f ? "none" : "1px solid var(--gray-light)",
                  }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>PERIOD · الفترة</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {periods.map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className="py-2 rounded-lg text-[11px] font-bold btn-press"
                  style={{
                    background: period === p ? "var(--gold)" : "var(--off-white)",
                    color: period === p ? "white" : "var(--navy)",
                    border: period === p ? "none" : "1px solid var(--gray-light)",
                  }}>
                  {periodLabel[p].en}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>INSTRUCTIONS · التعليمات</label>
            <textarea
              value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Take with food, avoid driving..."
              rows={2}
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-[13px] outline-none resize-none"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", color: "var(--navy)" }}
            />
          </div>

          {allergies.length > 0 && (
            <div className="rounded-xl p-2.5 text-[10px]" style={{ background: "rgba(217,79,79,0.06)", border: "1px solid rgba(217,79,79,0.2)" }}>
              <span style={{ color: "var(--error)" }}>⚠️ Allergies on file: </span>
              <span style={{ color: "var(--navy)" }}>{allergies.join(", ")}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-3 shrink-0" style={{ borderTop: "1px solid var(--gray-light)" }}>
          <button onClick={handleSubmit}
            className="w-full py-3 rounded-xl font-semibold text-white btn-press"
            style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}>
            Save Medication · حفظ الدواء
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMedicationSheet;
