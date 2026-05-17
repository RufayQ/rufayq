import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { carePlanStore, CARE_CATEGORIES, type CarePlanCategory } from "./carePlanStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const REPEATS: { key: "none" | "daily" | "weekdays"; en: string; ar: string }[] = [
  { key: "none", en: "Once", ar: "مرة" },
  { key: "daily", en: "Daily", ar: "يومي" },
  { key: "weekdays", en: "Weekdays", ar: "أيام الأسبوع" },
];

const AddCarePlanTaskSheet = ({ open, onClose }: Props) => {
  const [category, setCategory] = useState<CarePlanCategory>("medication");
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekdays">("daily");

  if (!open) return null;

  const submit = () => {
    if (!en.trim()) return;
    carePlanStore.add({
      en: en.trim(),
      ar: ar.trim() || undefined,
      category,
      time: time || undefined,
      repeat: repeat === "none" ? undefined : repeat,
    });
    toast.success("Task added · تم إضافة المهمة", { duration: 1800 });
    setEn(""); setAr(""); setTime(""); setRepeat("daily"); setCategory("medication");
    onClose();
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
            <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>Add Care Task</p>
            <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>إضافة مهمة رعاية</p>
          </div>
          <button onClick={onClose} className="btn-press" aria-label="Close">
            <X size={18} style={{ color: "var(--gray)" }} />
          </button>
        </div>

        <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>CATEGORY</label>
        <div className="grid grid-cols-4 gap-2 mt-1 mb-4">
          {CARE_CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="rounded-xl py-2 text-[10px] font-semibold btn-press flex flex-col items-center gap-0.5"
                style={{
                  background: active ? "var(--teal-deep)" : "var(--off-white)",
                  color: active ? "#fff" : "var(--navy)",
                  border: active ? "none" : "1px solid var(--gray-light)",
                }}
              >
                <span className="text-[16px]">{c.emoji}</span>
                <span className="leading-tight">{c.en}</span>
              </button>
            );
          })}
        </div>

        <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>TASK</label>
        <input
          value={en}
          onChange={(e) => setEn(e.target.value)}
          placeholder="e.g. Take antibiotic"
          dir="auto"
          className="w-full mt-1 mb-2 rounded-lg px-3 py-2 text-[12px] outline-none"
          style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
        />
        <input
          value={ar}
          onChange={(e) => setAr(e.target.value)}
          placeholder="بالعربية (اختياري)"
          dir="rtl"
          className="w-full mb-4 rounded-lg px-3 py-2 text-[12px] font-arabic outline-none"
          style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
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
          <div>
            <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>REPEAT</label>
            <div className="flex gap-1 mt-1">
              {REPEATS.map((r) => {
                const active = repeat === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => setRepeat(r.key)}
                    className="flex-1 rounded-lg py-2 text-[10px] font-semibold btn-press"
                    style={{
                      background: active ? "var(--teal-deep)" : "var(--off-white)",
                      color: active ? "#fff" : "var(--navy)",
                      border: active ? "none" : "1px solid var(--gray-light)",
                    }}
                  >
                    {r.en}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!en.trim()}
          className="w-full rounded-xl py-3 text-[13px] font-semibold btn-press disabled:opacity-50"
          style={{ background: "var(--teal-deep)", color: "#fff" }}
        >
          Save Task · حفظ المهمة
        </button>
      </div>
    </div>
  );
};

export default AddCarePlanTaskSheet;
