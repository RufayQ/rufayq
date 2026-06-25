import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, X, Download } from "lucide-react";
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
}

const JourneyCompleteCard = ({ trip, milestones, totalDays, notes = [], onCreateNewJourney }: Props) => {
  const [pack, setPack] = useState<{ url: string; fileName: string } | null>(null);

  const completed = useMemo(() => milestones.filter((m) => m.state === "done").length, [milestones]);
  const total = milestones.length;

  const openDischargePack = () => {
    if (pack) return setPack(pack);
    const result = buildDischargePackPdf({ trip, milestones, totalDays, notes });
    setPack({ url: result.url, fileName: result.fileName });
  };

  const closePack = () => {
    if (pack) URL.revokeObjectURL(pack.url);
    setPack(null);
  };

  const downloadPack = () => {
    if (!pack) return;
    const a = document.createElement("a");
    a.href = pack.url;
    a.download = pack.fileName;
    a.click();
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
              className="flex-1 rounded-full py-2.5 text-[12px] font-bold btn-press flex items-center justify-center gap-2"
              style={{ background: "var(--white)", color: "var(--teal-deep)", border: "1px solid var(--teal-deep)" }}
              aria-label="Discharge pack · ملخص الخروج"
            >
              <FileText size={14} /> Discharge pack · ملخص الخروج
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

      {pack && createPortal(
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "rgba(6,16,26,0.94)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--navy)", color: "var(--white)" }}>
            <div className="min-w-0">
              <p className="text-[13px] font-bold truncate">Discharge pack · ملخص الخروج</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.65)" }}>{pack.fileName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={downloadPack} className="w-9 h-9 rounded-full flex items-center justify-center btn-press" style={{ background: "rgba(255,255,255,0.12)", color: "var(--white)" }} aria-label="Download">
                <Download size={16} />
              </button>
              <button onClick={closePack} className="w-9 h-9 rounded-full flex items-center justify-center btn-press" style={{ background: "rgba(255,255,255,0.12)", color: "var(--white)" }} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
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
    </>
  );
};

export default JourneyCompleteCard;
