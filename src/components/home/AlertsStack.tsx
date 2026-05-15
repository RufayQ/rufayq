import { ChevronRight } from "lucide-react";
import DischargeAlertBanner from "@/components/home/DischargeAlertBanner";
import type { DashboardAlert } from "@/hooks/useJourneyOverview";
import { useLanguage } from "@/contexts/LanguageContext";

interface AlertsStackProps {
  alerts: DashboardAlert[];
  onOpenRecords: () => void;
}

const AlertsStack = ({ alerts, onOpenRecords }: AlertsStackProps) => {
  const { showEn, showAr } = useLanguage();
  const biLabel = (en: string, ar?: string) =>
    showEn && showAr && ar ? `${en} · ${ar}` : showAr && ar ? ar : en;

  return (
    <div className="space-y-2 stagger-3">
      <DischargeAlertBanner onClick={onOpenRecords} />
      {alerts.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--white)",
            border: "1px solid var(--gray-light)",
            boxShadow: "0 6px 20px -10px rgba(0,77,91,0.12)",
          }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <p
              className="font-mono text-[9.5px] tracking-[0.22em]"
              style={{ color: "var(--gray)" }}
            >
              {showEn && <span>UPDATES</span>}
              {showEn && showAr && <span> · </span>}
              {showAr && <span dir="rtl">تحديثات</span>}
            </p>
            <span
              className="font-mono text-[9px] px-2 py-[2px] rounded-full"
              style={{ background: "var(--gold-pale)", color: "var(--gold)" }}
            >
              {alerts.length}
            </span>
          </div>
          {alerts.map((a, i) => (
            <div key={a.id}>
              {i > 0 && (
                <div className="mx-4 h-px" style={{ background: "var(--gray-light)" }} />
              )}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left card-press"
                style={{ background: "transparent" }}
                aria-label={biLabel(a.en, a.ar)}
              >
                <span
                  className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[15px]"
                  style={{
                    background: "var(--off-white)",
                    border: `1.5px solid ${a.color}`,
                  }}
                >
                  {a.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  {showEn && (
                    <p
                      className="text-[12px] font-semibold truncate"
                      style={{ color: "var(--navy)" }}
                    >
                      {a.en}
                    </p>
                  )}
                  {showAr && (
                    <p
                      className="font-arabic text-[10px] truncate"
                      dir="rtl"
                      style={{ color: "var(--gray)" }}
                    >
                      {a.ar}
                    </p>
                  )}
                </div>
                {a.date && (
                  <span
                    className="font-mono text-[10px] tracking-wider whitespace-nowrap shrink-0"
                    style={{ color: a.color }}
                  >
                    {a.date}
                  </span>
                )}
                <ChevronRight size={14} style={{ color: "var(--gray)" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsStack;
