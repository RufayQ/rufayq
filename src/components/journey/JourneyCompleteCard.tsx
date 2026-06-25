import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Plus,
  X,
  Download,
  Share2,
  Link2,
  Mail,
  MessageCircle,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { TripData } from "@/components/AddTripSheet";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";
import { buildDischargePackPdf } from "@/lib/dischargePack";
import UniversalDocumentPreview from "@/components/records/UniversalDocumentPreview";

interface Props {
  trip: TripData;
  milestones: JourneyMilestone[];
  totalDays: number | null;
  notes?: string[];
  onCreateNewJourney: () => void;
  /** Open detail view for the given milestone id (renders MilestoneSheet). */
  onOpenMilestone?: (id: string) => void;
}

const milestoneLabel = (m: JourneyMilestone): { en: string; ar: string } => {
  if (m.kind === "departure") return { en: "Departure flight", ar: "رحلة المغادرة" };
  if (m.kind === "return") return { en: "Return flight", ar: "رحلة العودة" };
  if (m.subKind === "surgery") return { en: m.title || "Procedure", ar: "إجراء طبي" };
  return { en: m.title || "Appointment", ar: "موعد طبي" };
};

const JourneyCompleteCard = ({
  trip,
  milestones,
  totalDays,
  notes = [],
  onCreateNewJourney,
  onOpenMilestone,
}: Props) => {
  const [pack, setPack] = useState<{ url: string; fileName: string; blob: Blob } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const completed = useMemo(() => milestones.filter((m) => m.state === "done").length, [milestones]);
  const total = milestones.length;

  const ensurePack = () => {
    if (pack) return pack;
    const result = buildDischargePackPdf({ trip, milestones, totalDays, notes });
    const next = { url: result.url, fileName: result.fileName, blob: result.blob };
    setPack(next);
    return next;
  };

  const openDischargePack = () => {
    ensurePack();
  };

  const closePack = () => {
    if (pack) URL.revokeObjectURL(pack.url);
    setPack(null);
  };

  const downloadPack = () => {
    const p = ensurePack();
    const a = document.createElement("a");
    a.href = p.url;
    a.download = p.fileName;
    a.click();
  };

  const summaryText = () => {
    const lines = [
      `Discharge pack · ملخص الخروج — ${trip.destination || ""}`.trim(),
      trip.hospital ? `Hospital: ${trip.hospital}` : "",
      totalDays != null ? `Total days · إجمالي الأيام: ${totalDays}` : "",
      `Milestones · المراحل: ${completed}/${total}`,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const shareFile = async () => {
    const p = ensurePack();
    const file = new File([p.blob], p.fileName, { type: "application/pdf" });
    try {
      // @ts-ignore - canShare with files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Discharge pack", text: summaryText() });
        setShareOpen(false);
        return;
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
    }
    // Fallback: download and tell the user to attach manually
    downloadPack();
    toast.success("Pack downloaded — attach it to your message · تم التنزيل، أرفقه في رسالتك", { duration: 3200 });
    setShareOpen(false);
  };

  const copyLink = async () => {
    // Local blob URL is meaningful only in this browser session. Copy the
    // textual summary instead so it pastes useful context anywhere.
    try {
      await navigator.clipboard.writeText(summaryText());
      toast.success("Summary copied · تم نسخ الملخص", { duration: 2000 });
    } catch {
      toast.error("Could not copy · تعذّر النسخ");
    }
    setShareOpen(false);
  };

  const shareEmail = () => {
    downloadPack();
    const subject = encodeURIComponent(`Discharge pack — ${trip.destination || "Journey"}`);
    const body = encodeURIComponent(`${summaryText()}\n\n(See attached discharge pack PDF.)`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShareOpen(false);
  };

  const shareWhatsApp = () => {
    downloadPack();
    const text = encodeURIComponent(`${summaryText()}\n\n(Attach the downloaded discharge pack PDF.)`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    setShareOpen(false);
  };

  return (
    <>
      <section className="px-4 pt-3" aria-label="Journey complete · اكتملت الرحلة">
        <div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(0,77,91,0.10), rgba(197,150,90,0.14))",
            border: "1px solid rgba(197,150,90,0.40)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--white)" }}>
              <span aria-hidden="true">🏁</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--navy)" }}>
                Journey complete
              </p>
              <p className="font-arabic text-[12px] leading-tight mt-0.5" dir="rtl" style={{ color: "var(--teal-deep)" }}>
                اكتملت رحلة العلاج
              </p>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--gray)" }}>
                All milestones are done · انتهت جميع المراحل
              </p>
            </div>
          </div>

          {/* Bilingual summary stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2 text-center" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <p className="text-[18px] font-bold" style={{ color: "var(--teal-deep)" }}>{totalDays ?? "—"}</p>
              <p className="text-[9px]" style={{ color: "var(--gray)" }}>Total days</p>
              <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>إجمالي الأيام</p>
            </div>
            <div className="rounded-xl p-2 text-center" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <p className="text-[18px] font-bold" style={{ color: "var(--gold)" }}>{completed}/{total}</p>
              <p className="text-[9px]" style={{ color: "var(--gray)" }}>Milestones</p>
              <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>المراحل</p>
            </div>
            <div className="rounded-xl p-2 text-center" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <p className="text-[18px] font-bold" style={{ color: "var(--navy)" }}>{notes.length}</p>
              <p className="text-[9px]" style={{ color: "var(--gray)" }}>Key notes</p>
              <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>ملاحظات</p>
            </div>
          </div>

          {/* Tappable step summaries — opens the related milestone detail view */}
          {milestones.length > 0 && (
            <div className="rounded-xl p-2" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <p className="text-[11px] font-bold px-1 pb-1.5" style={{ color: "var(--navy)" }}>
                Step summary · ملخص المراحل
              </p>
              <ul className="flex flex-col gap-1" data-testid="journey-complete-steps">
                {milestones.map((m) => {
                  const lbl = milestoneLabel(m);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => onOpenMilestone?.(m.id)}
                        disabled={!onOpenMilestone}
                        data-testid={`journey-complete-step-${m.id}`}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg btn-press text-left"
                        style={{
                          background: "var(--off-white)",
                          cursor: onOpenMilestone ? "pointer" : "default",
                        }}
                        aria-label={`Open details for ${lbl.en}`}
                      >
                        <CheckCircle2 size={14} style={{ color: "var(--teal-deep)" }} aria-hidden="true" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[11px] font-bold truncate" style={{ color: "var(--navy)" }}>
                            {lbl.en}
                          </span>
                          <span
                            className="block font-arabic text-[10px] truncate"
                            dir="rtl"
                            style={{ color: "var(--gray)" }}
                          >
                            {lbl.ar}
                          </span>
                        </span>
                        {onOpenMilestone && (
                          <ChevronRight size={14} style={{ color: "var(--gray)" }} aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {notes.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
              <p className="text-[11px] font-bold mb-1" style={{ color: "var(--navy)" }}>
                Key notes · ملاحظات رئيسية
              </p>
              <ul className="space-y-1">
                {notes.slice(0, 5).map((n, i) => (
                  <li key={i} className="text-[11px]" style={{ color: "var(--gray-dark)" }}>• {n}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={openDischargePack}
              data-testid="discharge-pack-open"
              className="flex-1 rounded-full py-2.5 text-[12px] font-bold btn-press flex items-center justify-center gap-2"
              style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}
              aria-label="Discharge pack · ملخص الخروج"
            >
              <FileText size={14} /> Discharge pack · ملخص الخروج
            </button>
            <button
              onClick={() => setShareOpen(true)}
              data-testid="discharge-pack-share"
              className="rounded-full px-3 py-2.5 text-[12px] font-bold btn-press flex items-center justify-center"
              style={{ background: "var(--white)", color: "var(--navy)", border: "1px solid var(--gray-light)" }}
              aria-label="Share discharge pack · مشاركة"
            >
              <Share2 size={14} />
            </button>
            <button
              onClick={onCreateNewJourney}
              className="flex-1 rounded-full py-2.5 text-[12px] font-bold btn-press flex items-center justify-center gap-2"
              style={{ background: "var(--teal-deep)", color: "var(--white)" }}
            >
              <Plus size={14} /> New journey · رحلة جديدة
            </button>
          </div>
        </div>
      </section>

      {/* Discharge pack preview overlay */}
      {pack && createPortal(
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "rgba(6,16,26,0.94)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--navy)", color: "var(--white)" }}>
            <div className="min-w-0">
              <p className="text-[13px] font-bold truncate">Discharge pack · ملخص الخروج</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.65)" }}>{pack.fileName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={downloadPack} data-testid="discharge-pack-download" className="w-9 h-9 rounded-full flex items-center justify-center btn-press" style={{ background: "rgba(255,255,255,0.12)", color: "var(--white)" }} aria-label="Download discharge pack">
                <Download size={16} />
              </button>
              <button onClick={() => setShareOpen(true)} className="w-9 h-9 rounded-full flex items-center justify-center btn-press" style={{ background: "rgba(255,255,255,0.12)", color: "var(--white)" }} aria-label="Share discharge pack">
                <Share2 size={16} />
              </button>
              <button onClick={closePack} className="w-9 h-9 rounded-full flex items-center justify-center btn-press" style={{ background: "rgba(255,255,255,0.12)", color: "var(--white)" }} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto" data-testid="discharge-pack-preview">
            <UniversalDocumentPreview
              url={pack.url}
              fileName={pack.fileName}
              title="Discharge pack"
              mimeType="application/pdf"
            />
          </div>
        </div>,
        document.body,
      )}

      {/* Share menu */}
      {shareOpen && createPortal(
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center"
          style={{ background: "rgba(6,16,26,0.55)" }}
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-t-2xl p-3 flex flex-col gap-1.5"
            style={{ background: "var(--white)" }}
            onClick={(e) => e.stopPropagation()}
            data-testid="discharge-pack-share-menu"
          >
            <div className="flex items-center justify-between px-1 pb-1">
              <p className="text-[12px] font-bold" style={{ color: "var(--navy)" }}>
                Share discharge pack · مشاركة
              </p>
              <button onClick={() => setShareOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--off-white)" }} aria-label="Close">
                <X size={12} />
              </button>
            </div>
            {[
              { id: "file", icon: Share2, en: "Share file", ar: "مشاركة الملف", fn: shareFile },
              { id: "copy", icon: Link2, en: "Copy summary link", ar: "نسخ الملخص", fn: copyLink },
              { id: "email", icon: Mail, en: "Email", ar: "البريد الإلكتروني", fn: shareEmail },
              { id: "whatsapp", icon: MessageCircle, en: "WhatsApp", ar: "واتساب", fn: shareWhatsApp },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={opt.fn}
                data-testid={`discharge-pack-share-${opt.id}`}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl btn-press"
                style={{ background: "var(--off-white)" }}
              >
                <opt.icon size={16} style={{ color: "var(--teal-deep)" }} />
                <span className="flex-1 text-left">
                  <span className="block text-[12px] font-bold" style={{ color: "var(--navy)" }}>{opt.en}</span>
                  <span className="block font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{opt.ar}</span>
                </span>
                <ChevronRight size={14} style={{ color: "var(--gray)" }} />
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default JourneyCompleteCard;
