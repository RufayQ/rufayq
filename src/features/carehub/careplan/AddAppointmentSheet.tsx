import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { appointmentApi } from "@/lib/api/appointmentApi";
import { useGuestMode } from "@/hooks/useGuestMode";

interface Props {
  open: boolean;
  onClose: () => void;
}

const VISIT_TYPES: { key: string; en: string; ar: string; emoji: string }[] = [
  { key: "consultation", en: "Consultation", ar: "استشارة", emoji: "🩺" },
  { key: "follow-up", en: "Follow-up", ar: "متابعة", emoji: "🔁" },
  { key: "surgery", en: "Surgery", ar: "عملية", emoji: "🏥" },
  { key: "lab", en: "Lab", ar: "تحاليل", emoji: "🧪" },
  { key: "imaging", en: "Imaging", ar: "أشعة", emoji: "📷" },
  { key: "physio", en: "Physio", ar: "علاج طبيعي", emoji: "🏃" },
];

const GUEST_KEY = "rufayq_guest_appointments";

const AddAppointmentSheet = ({ open, onClose }: Props) => {
  const isGuest = useGuestMode();
  const [visitType, setVisitType] = useState("follow-up");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const reset = () => {
    setTitle(""); setDate(""); setTime(""); setProvider(""); setNotes(""); setVisitType("follow-up");
  };

  const submit = async () => {
    if (!title.trim() || !date) return;
    setSaving(true);
    const startAt = time ? `${date}T${time}:00` : `${date}T09:00:00`;
    try {
      if (isGuest) {
        const raw = localStorage.getItem(GUEST_KEY);
        const list = raw ? JSON.parse(raw) : [];
        list.push({
          id: crypto.randomUUID(),
          title: title.trim(),
          visit_type: visitType,
          appointment_type: visitType,
          doctor_name: provider.trim() || null,
          facility_name: null,
          start_at: startAt,
          notes: notes.trim() || null,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(GUEST_KEY, JSON.stringify(list));
        window.dispatchEvent(new StorageEvent("storage", { key: GUEST_KEY }));
      } else {
        await appointmentApi.save({
          title: title.trim(),
          appointment_type: visitType,
          visit_type: visitType,
          doctor_name: provider.trim() || null,
          facility_name: null,
          start_at: startAt,
          end_at: null,
          notes: notes.trim() || null,
          location: null,
          client_generated_id: crypto.randomUUID(),
          source: "carehub_manual",
        } as any);
      }
      toast.success("Appointment added · تم إضافة الموعد", { duration: 1800 });
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Could not save appointment · تعذر الحفظ", { duration: 2200 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-5 pb-8 max-h-[88vh] overflow-y-auto"
        style={{ background: "var(--white)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>Add Appointment</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>إضافة موعد</p>
          </div>
          <button onClick={onClose} className="btn-press" aria-label="Close">
            <X size={18} style={{ color: "var(--gray)" }} />
          </button>
        </div>

        <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>VISIT TYPE</label>
        <div className="grid grid-cols-3 gap-2 mt-1 mb-4">
          {VISIT_TYPES.map((v) => {
            const active = visitType === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setVisitType(v.key)}
                className="rounded-xl py-2 text-[10px] font-semibold btn-press flex flex-col items-center gap-0.5"
                style={{
                  background: active ? "var(--teal-deep)" : "var(--off-white)",
                  color: active ? "#fff" : "var(--navy)",
                  border: active ? "none" : "1px solid var(--gray-light)",
                }}
              >
                <span className="text-[15px]">{v.emoji}</span>
                <span>{v.en}</span>
              </button>
            );
          })}
        </div>

        <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>TITLE</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Knee follow-up with Dr. Lee"
          dir="auto"
          className="w-full mt-1 mb-3 rounded-lg px-3 py-2 text-[12px] outline-none"
          style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>DATE</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
            />
          </div>
          <div>
            <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>TIME</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full mt-1 rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
            />
          </div>
        </div>

        <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>PROVIDER / CLINIC</label>
        <input
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          placeholder="Dr. name or clinic (optional)"
          dir="auto"
          className="w-full mt-1 mb-3 rounded-lg px-3 py-2 text-[12px] outline-none"
          style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
        />

        <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>NOTES</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          dir="auto"
          rows={2}
          className="w-full mt-1 mb-4 rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
          style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
        />

        <button
          onClick={submit}
          disabled={!title.trim() || !date || saving}
          className="w-full rounded-xl py-3 text-[13px] font-semibold btn-press disabled:opacity-50"
          style={{ background: "var(--teal-deep)", color: "#fff" }}
        >
          {saving ? "Saving…" : "Save Appointment · حفظ الموعد"}
        </button>
      </div>
    </div>
  );
};

export default AddAppointmentSheet;
