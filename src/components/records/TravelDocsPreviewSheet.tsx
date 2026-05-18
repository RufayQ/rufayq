import { useEffect, useMemo } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { CAT_DEFS, classify, type TravelCat } from "@/components/records/TravelRecordsList";
import type { TransportAttachment } from "@/components/RelatedDocumentsCard";

type Action = "copy" | "export" | "share";

const ACTION_LABEL: Record<Action, { en: string; ar: string }> = {
  copy: { en: "Copy Travel Summary", ar: "نسخ ملخص السفر" },
  export: { en: "Export Travel Docs", ar: "تصدير وثائق السفر" },
  share: { en: "Share Travel Docs", ar: "مشاركة وثائق السفر" },
};

interface Props {
  open: boolean;
  action: Action | null;
  docs: TransportAttachment[];
  onClose: () => void;
  onContinue: () => void;
}

const fmtEn = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const isImage = (mime?: string | null) => !!mime && mime.startsWith("image/");

const TravelDocsPreviewSheet = ({ open, action, docs, onClose, onContinue }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grouped = useMemo(() => {
    const map = new Map<TravelCat, TransportAttachment[]>();
    for (const def of CAT_DEFS) if (def.key !== "all") map.set(def.key, []);
    for (const d of docs) map.get(classify(d))?.push(d);
    return map;
  }, [docs]);

  if (!open || !action) return null;
  const title = ACTION_LABEL[action];
  const total = docs.length;
  const totalAr = total.toLocaleString("ar-EG");
  const isEmpty = total === 0;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center"
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[390px] rounded-t-3xl p-5 pb-7 flex flex-col"
        style={{
          background: "var(--bg-elevated, #ffffff)",
          color: "var(--text-primary, #0f1f2c)",
          boxShadow: "0 -8px 28px rgba(0,0,0,0.35)",
          maxHeight: "85vh",
        }}
      >
        <div className="flex items-center justify-between mb-1 shrink-0">
          <p className="font-mono text-[10px] tracking-widest opacity-50">REVIEW · مراجعة</p>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] opacity-60 hover:opacity-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="font-display text-lg shrink-0" style={{ fontWeight: 400 }}>{title.en}</p>
        <p className="font-arabic text-xs opacity-60 shrink-0" dir="rtl">{title.ar}</p>

        <div className="mt-3 mb-3 shrink-0 flex items-baseline justify-between">
          {isEmpty ? (
            <>
              <span className="text-sm opacity-70">No travel documents to include</span>
              <span className="font-arabic text-xs opacity-60" dir="rtl">لا توجد وثائق سفر</span>
            </>
          ) : (
            <>
              <span className="text-sm">
                <span style={{ color: "var(--teal-deep, #0a6e6e)", fontWeight: 600 }}>{total}</span>{" "}
                {total === 1 ? "item will be included" : "items will be included"}
              </span>
              <span className="font-arabic text-xs opacity-70" dir="rtl">
                سيتم تضمين {totalAr} {total === 1 ? "عنصر" : "عناصر"}
              </span>
            </>
          )}
        </div>

        {!isEmpty && (
          <div
            className="flex-1 overflow-y-auto -mx-1 px-1"
            style={{ maxHeight: "55vh" }}
          >
            {CAT_DEFS.filter((c) => c.key !== "all").map((def) => {
              const items = grouped.get(def.key) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={def.key} className="mb-3">
                  <div className="flex items-baseline justify-between px-1 mb-1.5">
                    <p className="text-[11px] font-mono tracking-wider uppercase opacity-60">
                      {def.en} ({items.length})
                    </p>
                    <p className="font-arabic text-[11px] opacity-50" dir="rtl">{def.ar}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {items.map((it) => {
                      const Icon = isImage(it.mime_type) ? ImageIcon : FileText;
                      return (
                        <div
                          key={it.id}
                          className="flex items-start gap-2.5 px-3 py-2 rounded-xl"
                          style={{
                            background: "var(--surface-1, rgba(0,0,0,0.04))",
                            border: "1px solid var(--border-subtle, rgba(0,0,0,0.06))",
                          }}
                        >
                          <Icon size={14} className="mt-0.5 shrink-0 opacity-60" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] truncate" style={{ fontWeight: 500 }}>{it.label}</p>
                            <p className="text-[11px] opacity-55 truncate">{it.file_name}</p>
                          </div>
                          {it.created_at && (
                            <span className="text-[10px] opacity-50 shrink-0 mt-0.5">
                              {fmtEn(it.created_at)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 shrink-0 flex flex-col gap-2">
          <button
            type="button"
            onClick={onContinue}
            disabled={isEmpty}
            className="w-full py-3 rounded-full text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--teal-deep, #0a6e6e)",
              color: "#ffffff",
            }}
          >
            Continue · متابعة
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-full text-[12px] opacity-70"
            style={{ border: "1px solid var(--border-subtle, rgba(0,0,0,0.12))" }}
          >
            Cancel · إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

export default TravelDocsPreviewSheet;
