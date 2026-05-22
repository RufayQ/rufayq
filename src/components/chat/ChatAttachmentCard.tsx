/**
 * Renders an inbound/outbound chat attachment as the same "elite card" style
 * used in the Records screen, plus an action sheet that lets the receiving
 * user preview the file in-app or save a copy into their own Records vault
 * (choosing Travel or Medical at save time).
 *
 * Why: previously attachments were serialised as a plain blob URL link, so
 * tapping it on a phone bounced the user out of the WebView into the system
 * browser/file picker. The card keeps the experience inside the chat.
 */
import { useState } from "react";
import { Paperclip, FileText, Image as ImageIcon, ExternalLink, Save, X } from "lucide-react";
import { toast } from "sonner";
import type { ChatAttachmentPayload } from "@/lib/chat/chatAttachmentBody";
import { addScannedRecord } from "@/lib/scannedRecordsStore";
import { addTravelScannedRecord } from "@/lib/travelScannedRecordsStore";

interface Props {
  payload: ChatAttachmentPayload;
  mine: boolean;
}

const isImage = (mime: string | null | undefined, fileName: string): boolean => {
  if (mime?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(fileName);
};

const ChatAttachmentCard = ({ payload, mine }: Props) => {
  const [showActions, setShowActions] = useState(false);
  const [showSavePicker, setShowSavePicker] = useState(false);
  const image = isImage(payload.mimeType, payload.fileName);

  const openInline = () => {
    setShowActions(false);
    if (!payload.url) {
      toast.error("No preview available · لا توجد معاينة");
      return;
    }
    // Open inside the WebView via a same-origin redirect target — the user
    // can use the system back gesture to return. This keeps the in-app
    // experience for both Capacitor (Android) and PWA contexts.
    window.open(payload.url, "_blank", "noopener,noreferrer");
  };

  const saveAs = (kind: "travel" | "medical") => {
    setShowSavePicker(false);
    setShowActions(false);
    try {
      if (kind === "travel") {
        addTravelScannedRecord({
          category: "legal",
          subcategory: payload.sourceLabelEn,
          title: payload.label,
          fileName: payload.fileName,
          pageCount: 1,
          fileUrl: payload.url,
          mimeType: payload.mimeType ?? null,
        });
      } else {
        addScannedRecord({
          category: "other",
          titleEn: payload.label,
          titleAr: payload.label,
          source: "Shared in chat",
          fileName: payload.fileName,
          fileUrl: payload.url,
          mimeType: payload.mimeType ?? null,
        });
      }
      toast.success("Saved to your Records · حُفظ في سجلاتك");
    } catch {
      toast.error("Couldn't save · تعذر الحفظ");
    }
  };

  const accent = mine ? "var(--gold)" : "var(--teal-deep)";
  const surface = mine ? "rgba(255,255,255,0.10)" : "var(--off-white)";
  const surfaceText = mine ? "#fff" : "var(--ink)";
  const subdued = mine ? "rgba(255,255,255,0.75)" : "var(--gray)";

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShowActions(true); }}
        className="w-full text-left rounded-xl p-3 btn-press transition-transform active:scale-[0.98]"
        style={{
          background: surface,
          border: `1px solid ${mine ? "rgba(255,255,255,0.18)" : "var(--gray-light)"}`,
        }}
        aria-label={`Attached document: ${payload.label}`}
      >
        <div className="flex items-start gap-2.5">
          <div
            className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: mine ? "rgba(255,255,255,0.16)" : "var(--white)", color: accent }}
          >
            {image ? <ImageIcon size={18} /> : <FileText size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold leading-snug" style={{ color: surfaceText }} dir="auto">
              {payload.label}
            </p>
            <p className="text-[11px] truncate mt-0.5" style={{ color: subdued }}>
              {payload.fileName}
            </p>
            <p className="text-[9.5px] font-mono tracking-wide mt-1" style={{ color: subdued }}>
              {payload.sourceLabelEn} · {payload.sourceLabelAr}
            </p>
          </div>
          <Paperclip size={13} style={{ color: accent, marginTop: 2 }} />
        </div>
      </button>

      {showActions && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowActions(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-t-2xl pb-6 pt-3 px-3 animate-fade-in-up"
            style={{ background: "var(--white)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--gray-light)" }} />
            <div className="px-2 pb-3">
              <p className="text-[12.5px] font-bold" style={{ color: "var(--ink)" }} dir="auto">{payload.label}</p>
              <p className="text-[11px]" style={{ color: "var(--gray)" }}>{payload.fileName}</p>
            </div>
            <button
              onClick={openInline}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl btn-press"
              style={{ background: "var(--off-white)", color: "var(--ink)" }}
            >
              <ExternalLink size={16} style={{ color: "var(--teal-deep)" }} />
              <span className="text-[13px] font-semibold">Open preview · فتح المعاينة</span>
            </button>
            <button
              onClick={() => { setShowActions(false); setShowSavePicker(true); }}
              className="mt-2 w-full flex items-center gap-3 px-3 py-3 rounded-xl btn-press"
              style={{ background: "var(--off-white)", color: "var(--ink)" }}
            >
              <Save size={16} style={{ color: "var(--gold)" }} />
              <span className="text-[13px] font-semibold">Save to my Records · حفظ في سجلاتي</span>
            </button>
            <button
              onClick={() => setShowActions(false)}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl btn-press"
              style={{ color: "var(--gray)" }}
            >
              <X size={14} /> <span className="text-[12px]">Cancel · إلغاء</span>
            </button>
          </div>
        </div>
      )}

      {showSavePicker && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowSavePicker(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-t-2xl pb-6 pt-3 px-3 animate-fade-in-up"
            style={{ background: "var(--white)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "var(--gray-light)" }} />
            <p className="px-2 pb-2 text-[12px] font-bold" style={{ color: "var(--gray)" }}>
              Choose record type · اختر نوع السجل
            </p>
            <button
              onClick={() => saveAs("travel")}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl btn-press"
              style={{ background: "var(--off-white)", color: "var(--ink)" }}
            >
              <span className="text-[18px]">🛫</span>
              <span className="text-[13px] font-semibold">Travel record · سجل سفر</span>
            </button>
            <button
              onClick={() => saveAs("medical")}
              className="mt-2 w-full flex items-center gap-3 px-3 py-3 rounded-xl btn-press"
              style={{ background: "var(--off-white)", color: "var(--ink)" }}
            >
              <span className="text-[18px]">🩺</span>
              <span className="text-[13px] font-semibold">Medical record · سجل طبي</span>
            </button>
            <button
              onClick={() => setShowSavePicker(false)}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl btn-press"
              style={{ color: "var(--gray)" }}
            >
              <X size={14} /> <span className="text-[12px]">Cancel · إلغاء</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAttachmentCard;
