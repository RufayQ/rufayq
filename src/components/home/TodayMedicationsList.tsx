import type { Medication } from "@/constants/data";

interface Props {
  medications: Medication[];
  onViewAll: () => void;
}

const statusColor = (s: Medication["status"]) =>
  s === "taken" ? "var(--success)"
    : s === "due" ? "var(--warning)"
    : s === "upcoming" ? "var(--gray)"
    : "var(--error)";

const TodayMedicationsList = ({ medications, onViewAll }: Props) => (
  <div className="stagger-4">
    <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gray)" }}>TODAY'S MEDICATIONS</p>
    {medications.length === 0 ? (
      <div
        className="rounded-xl p-3 text-center"
        style={{ background: "var(--white)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>No medications scheduled today</p>
        <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>لا توجد أدوية مجدولة اليوم</p>
      </div>
    ) : (
      <div className="space-y-2">
        {medications.map((med, i) => (
          <div key={i} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--white)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: statusColor(med.status),
                boxShadow: med.status === "due" ? "0 0 0 3px rgba(224,160,48,0.2)" : "none",
              }}
            />
            <div className="flex-1">
              <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{med.name}</p>
              <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{med.nameAr}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: statusColor(med.status) }}>{med.time}</p>
              <p className="font-mono text-[10px]" style={{ color: "var(--gray)" }}>{med.frequency}</p>
            </div>
          </div>
        ))}
      </div>
    )}
    <button onClick={onViewAll} className="block ml-auto mt-2 text-[11px] btn-press" style={{ color: "var(--teal-mid)" }}>
      View all medications →
    </button>
  </div>
);

export default TodayMedicationsList;
