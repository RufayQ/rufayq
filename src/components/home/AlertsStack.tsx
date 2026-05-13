import DischargeAlertBanner from "@/components/home/DischargeAlertBanner";
import type { DashboardAlert } from "@/hooks/useJourneyOverview";

interface AlertsStackProps {
  alerts: DashboardAlert[];
  onOpenRecords: () => void;
}

const AlertsStack = ({ alerts, onOpenRecords }: AlertsStackProps) => {
  return (
    <div className="space-y-2 stagger-3">
      <DischargeAlertBanner onClick={onOpenRecords} />
      {alerts.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
          {alerts.map((a, i) => (
            <div key={a.id}>
              {i > 0 && <div className="mx-4 h-px" style={{ background: "var(--gray-light)" }} />}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-base">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--navy)" }}>{a.en}</p>
                  <p className="font-arabic text-[10px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>{a.ar}</p>
                </div>
                {a.date && <span className="text-xs font-semibold whitespace-nowrap" style={{ color: a.color }}>{a.date}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsStack;
