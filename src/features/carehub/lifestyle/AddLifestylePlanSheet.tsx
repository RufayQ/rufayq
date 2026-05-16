import { useState } from "react";
import { X } from "lucide-react";
import { lifestyleStore, type LifestylePlanType } from "./lifestyleStore";
import { armReminder } from "./lifestyleReminders";

interface Props {
  open: boolean;
  defaultType: LifestylePlanType;
  onClose: () => void;
}

const TYPES: { key: LifestylePlanType; en: string; ar: string; emoji: string }[] = [
  { key: "gym", en: "Gym", ar: "نادي", emoji: "🏋️" },
  { key: "nutrition", en: "Nutrition", ar: "تغذية", emoji: "🥗" },
  { key: "recreation", en: "Recreation", ar: "ترفيه", emoji: "🌿" },
  { key: "fitness", en: "Fitness", ar: "لياقة", emoji: "🏃" },
];

const AddLifestylePlanSheet = ({ open, defaultType, onClose }: Props) => {
  const [type, setType] = useState<LifestylePlanType>(defaultType);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [reminderTime, setReminderTime] = useState("07:00");

  if (!open) return null;

  const submit = () => {
    if (!title.trim()) return;
    const plan = lifestyleStore.add({
      type,
      title: title.trim(),
      titleAr: titleAr.trim() || undefined,
      weeklyTarget,
      reminderTime,
    });
    armReminder(plan);
    setTitle("");
    setTitleAr("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-5 pb-8"
        style={{ background: "var(--white)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-bold" style={{ color: "var(--navy)" }}>
            Add Lifestyle Plan · <span className="font-arabic">إضافة خطة</span>
          </p>
          <button onClick={onClose} className="btn-press">
            <X size={18} style={{ color: "var(--gray)" }} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className="rounded-xl py-2 text-[10px] font-medium btn-press"
              style={{
                background: type === t.key ? "var(--teal-deep)" : "var(--off-white)",
                color: type === t.key ? "#fff" : "var(--navy)",
              }}
            >
              <div className="text-[16px]">{t.emoji}</div>
              {t.en}
            </button>
          ))}
        </div>

        <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>
          TITLE
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Morning Run"
          className="w-full mt-1 mb-2 rounded-lg px-3 py-2 text-[12px] outline-none"
          style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
        />

        <input
          value={titleAr}
          onChange={(e) => setTitleAr(e.target.value)}
          placeholder="العنوان بالعربية (اختياري)"
          dir="rtl"
          className="w-full mb-3 rounded-lg px-3 py-2 text-[12px] font-arabic outline-none"
          style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>
              WEEKLY TARGET
            </label>
            <input
              type="number"
              min={1}
              max={21}
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(+e.target.value || 1)}
              className="w-full mt-1 rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
            />
          </div>
          <div>
            <label className="text-[10px] font-mono tracking-widest" style={{ color: "var(--gray)" }}>
              REMINDER
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full mt-1 rounded-lg px-3 py-2 text-[12px] outline-none"
              style={{ background: "var(--off-white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
            />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!title.trim()}
          className="w-full rounded-xl py-3 text-[13px] font-semibold btn-press disabled:opacity-50"
          style={{ background: "var(--teal-deep)", color: "#fff" }}
        >
          Save Plan · حفظ الخطة
        </button>
      </div>
    </div>
  );
};

export default AddLifestylePlanSheet;
