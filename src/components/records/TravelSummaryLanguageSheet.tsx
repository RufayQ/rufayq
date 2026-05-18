import { useEffect } from "react";

export type SummaryLang = "en" | "ar" | "both";

type Action = "copy" | "export" | "share";

const ACTION_LABEL: Record<Action, { en: string; ar: string }> = {
  copy: { en: "Copy Travel Summary", ar: "نسخ ملخص السفر" },
  export: { en: "Export Travel Docs", ar: "تصدير وثائق السفر" },
  share: { en: "Share Travel Docs", ar: "مشاركة وثائق السفر" },
};

interface Props {
  open: boolean;
  action: Action | null;
  onClose: () => void;
  onPick: (lang: SummaryLang) => void;
}

const OPTIONS: Array<{ lang: SummaryLang; en: string; ar: string }> = [
  { lang: "both", en: "Bilingual", ar: "ثنائي اللغة" },
  { lang: "en", en: "English", ar: "الإنجليزية" },
  { lang: "ar", en: "العربية", ar: "Arabic" },
];

const TravelSummaryLanguageSheet = ({ open, action, onClose, onPick }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !action) return null;
  const title = ACTION_LABEL[action];

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center"
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[390px] rounded-t-3xl p-5 pb-7"
        style={{
          background: "var(--bg-elevated, #ffffff)",
          color: "var(--text-primary, #0f1f2c)",
          boxShadow: "0 -8px 28px rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-[10px] tracking-widest opacity-50">SUMMARY LANGUAGE · لغة الملخص</p>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] opacity-60 hover:opacity-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="font-display text-lg" style={{ fontWeight: 400 }}>{title.en}</p>
        <p className="font-arabic text-xs opacity-60 mb-4" dir="rtl">{title.ar}</p>

        <div className="flex flex-col gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.lang}
              type="button"
              onClick={() => onPick(opt.lang)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition"
              style={{
                background: "var(--surface-1, rgba(0,0,0,0.04))",
                border: "1px solid var(--border-subtle, rgba(0,0,0,0.08))",
              }}
            >
              <span className="text-sm">{opt.en}</span>
              <span className="font-arabic text-sm opacity-70" dir="rtl">{opt.ar}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-full text-[12px] opacity-70"
          style={{ border: "1px solid var(--border-subtle, rgba(0,0,0,0.12))" }}
        >
          Cancel · إلغاء
        </button>
      </div>
    </div>
  );
};

export default TravelSummaryLanguageSheet;
