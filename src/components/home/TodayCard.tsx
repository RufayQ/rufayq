import { ChevronRight } from "lucide-react";
import type { JourneyOverview } from "@/hooks/useJourneyOverview";

interface TodayCardProps {
  overview: JourneyOverview;
  onOpenJourney: () => void;
  onPlanFirstTrip: () => void;
}

const TodayCard = ({ overview, onOpenJourney, onPlanFirstTrip }: TodayCardProps) => {
  const { activeTrip, dayN, totalDays, nextAppointment, nextMedication } = overview;

  if (!activeTrip) {
    return (
      <button
        onClick={onPlanFirstTrip}
        className="w-full rounded-2xl p-5 text-left animate-fade-in-up card-press"
        style={{ background: "var(--white)", boxShadow: "0 8px 32px rgba(0,77,91,0.10)" }}
      >
        <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>
          TODAY · اليوم
        </p>
        <p className="font-display text-lg" style={{ color: "var(--navy)" }}>
          Plan your first journey →
        </p>
        <p className="font-arabic text-xs mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>
          ابدأ رحلتك العلاجية الأولى
        </p>
      </button>
    );
  }

  const nextLine = nextAppointment
    ? { en: `Next · ${nextAppointment.specialty} at ${nextAppointment.time}`, ar: `التالي · ${nextAppointment.specialtyAr || nextAppointment.specialty}` }
    : nextMedication
    ? { en: `Next · ${nextMedication.name} at ${nextMedication.time}`, ar: `التالي · ${nextMedication.nameAr}` }
    : { en: "Open Journey for full timeline", ar: "افتح رحلتك للاطلاع على الخط الزمني" };

  return (
    <div
      className="rounded-2xl p-5 animate-fade-in-up"
      style={{ background: "var(--white)", boxShadow: "0 8px 32px rgba(0,77,91,0.14)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--gold)" }}>
          TODAY · اليوم
        </p>
        {totalDays != null && dayN != null && (
          <span
            className="font-mono text-[10px] px-3 py-1 rounded-full"
            style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
          >
            Day {dayN} / {totalDays}
          </span>
        )}
      </div>
      <p className="font-display text-lg" style={{ color: "var(--navy)" }}>
        {activeTrip.specialtyEmoji || "🏥"} {activeTrip.destination}
      </p>
      <p className="text-[12px] mt-0.5" style={{ color: "var(--gray)" }}>{nextLine.en}</p>
      <p className="font-arabic text-[11px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>{nextLine.ar}</p>

      <button
        onClick={onOpenJourney}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold text-white btn-press"
        style={{ background: "var(--teal-deep)" }}
      >
        Open Journey · افتح رحلتك <ChevronRight size={14} />
      </button>
    </div>
  );
};

export default TodayCard;
