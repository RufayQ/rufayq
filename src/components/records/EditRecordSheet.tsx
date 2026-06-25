import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";

export interface EditRecordTarget {
  id: string;
  kind: "attachment" | "scanned-travel" | "lounge-card";
  label: string;
  subcategory: string | null;
}

export interface EditRecordValues {
  label: string;
  subcategory: string | null;
}

interface Props {
  open: boolean;
  target: EditRecordTarget | null;
  onClose: () => void;
  onSave: (values: EditRecordValues) => void | Promise<void>;
}

const TYPE_OPTIONS: { value: string; en: string; ar: string }[] = [
  { value: "Passport", en: "Passport", ar: "جواز" },
  { value: "Visa", en: "Visa", ar: "تأشيرة" },
  { value: "Boarding Pass", en: "Boarding Pass", ar: "بطاقة صعود" },
  { value: "Flight Ticket", en: "Flight Ticket", ar: "تذكرة طيران" },
  { value: "Hotel Booking", en: "Hotel Booking", ar: "حجز فندق" },
  { value: "Insurance", en: "Insurance", ar: "تأمين" },
  { value: "Lounge Card", en: "Lounge Card", ar: "بطاقة صالة" },
  { value: "Other", en: "Other", ar: "أخرى" },
];

const EditRecordSheet = ({ open, target, onClose, onSave }: Props) => {
  const [label, setLabel] = useState("");
  const [subcategory, setSubcategory] = useState<string>("Other");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setLabel(target.label || "");
      setSubcategory(target.subcategory || "Other");
    }
  }, [target?.id, target?.label, target?.subcategory]);

  if (!open || !target) return null;

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({ label: label.trim() || target.label, subcategory });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center" style={{ background: "rgba(6,16,26,0.55)" }} onClick={onClose}>
      <div
        className="w-full max-w-[420px] rounded-t-2xl p-4 flex flex-col gap-3"
        style={{ background: "var(--white)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold" style={{ color: "var(--navy)" }}>Edit document · تعديل المستند</p>
            <p className="text-[10px]" style={{ color: "var(--gray)" }}>Update name and document type</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center btn-press" style={{ background: "var(--off-white)" }} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold" style={{ color: "var(--gray-dark)" }}>Name · الاسم</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ border: "1px solid var(--gray-light)", background: "var(--white)", color: "var(--navy)" }}
            placeholder="Document name"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold" style={{ color: "var(--gray-dark)" }}>Document type · نوع المستند</span>
          <div className="grid grid-cols-2 gap-1.5">
            {TYPE_OPTIONS.map((opt) => {
              const active = subcategory === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSubcategory(opt.value)}
                  className="rounded-lg px-3 py-2 text-[11px] flex items-center justify-between btn-press"
                  style={{
                    background: active ? "var(--teal-deep)" : "var(--off-white)",
                    color: active ? "var(--white)" : "var(--navy)",
                    border: active ? "1px solid var(--teal-deep)" : "1px solid var(--gray-light)",
                  }}
                >
                  <span className="text-left leading-tight">
                    <span className="block font-bold">{opt.en}</span>
                    <span className="block font-arabic text-[10px]" dir="rtl" style={{ opacity: 0.85 }}>{opt.ar}</span>
                  </span>
                  {active && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="rounded-full py-2.5 text-[12px] font-bold btn-press flex items-center justify-center gap-2 mt-1"
          style={{ background: "var(--teal-deep)", color: "var(--white)", opacity: saving ? 0.6 : 1 }}
        >
          <Check size={14} /> {saving ? "Saving…" : "Save · حفظ"}
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default EditRecordSheet;
