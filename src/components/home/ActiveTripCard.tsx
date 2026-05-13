import { Plus } from "lucide-react";
import type { TripData } from "@/components/AddTripSheet";

interface ActiveTripCardProps {
  trip: TripData;
  journeyCount: number;
  daysLeft: number | null;
  progressPct: number;
  formattedDepartureDate: string;
  formattedReturnDate: string;
  onViewJourney: () => void;
  onNewTrip: () => void;
}

const ActiveTripCard = ({
  trip,
  journeyCount,
  daysLeft,
  progressPct,
  formattedDepartureDate,
  formattedReturnDate,
  onViewJourney,
  onNewTrip,
}: ActiveTripCardProps) => (
  <div
    className="rounded-2xl p-5 animate-fade-in-up"
    style={{ background: "var(--white)", boxShadow: "0 8px 32px rgba(0,77,91,0.14)" }}
  >
    <div className="flex items-center justify-between mb-1">
      <div className="min-w-0">
        <p className="font-mono text-[9px] tracking-widest truncate" style={{ color: "var(--gold)" }}>
          {trip.status === "active" ? "ACTIVE TRIP" : "UPCOMING TRIP"} — {(trip.destination || "Journey").toUpperCase()}
        </p>
        <p className="font-display text-lg mt-0.5 truncate" style={{ color: "var(--navy)" }}>
          {trip.specialtyEmoji || "🏥"} {trip.specialty || trip.hospital || "Treatment journey"}
        </p>
        <p className="font-arabic text-xs" dir="rtl" style={{ color: "var(--gray)" }}>رحلتك العلاجية الحالية</p>
      </div>
      <span
        className="font-mono text-[10px] px-3 py-1 rounded-full shrink-0"
        style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}
      >
        {formattedDepartureDate} → {formattedReturnDate}
      </span>
    </div>

    <div className="w-full h-1.5 rounded-full mt-3 mb-3" style={{ background: "var(--gray-light)" }}>
      <div
        className="h-1.5 rounded-full animate-progress"
        style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--teal-deep), var(--teal-bright))" }}
      />
    </div>

    <div className="grid grid-cols-3 text-center">
      {[
        { val: journeyCount, sub: journeyCount === 1 ? "Journey" : "Journeys", subAr: "رحلات", color: "var(--success)" },
        { val: daysLeft ?? "—", sub: "Days Left", subAr: "أيام متبقية", color: "var(--teal-deep)" },
        { val: trip.companion ? "Yes" : "—", sub: "Companion", subAr: "مرافق", color: "var(--gold)" },
      ].map((stat, i) => (
        <div key={stat.sub} className="relative">
          {i > 0 && <div className="absolute left-0 top-1 bottom-1 w-px" style={{ background: "var(--gray-light)" }} />}
          <p className="font-display text-2xl" style={{ color: stat.color }}>{stat.val}</p>
          <p className="text-[10px]" style={{ color: "var(--gray)" }}>{stat.sub}</p>
          <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{stat.subAr}</p>
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between mt-3">
      <button onClick={onViewJourney} className="text-xs btn-press" style={{ color: "var(--teal-mid)" }}>
        View full journey →
      </button>
      <button
        onClick={onNewTrip}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold btn-press"
        style={{ background: "var(--teal-deep)", color: "#fff" }}
      >
        <Plus size={10} /> New Trip
      </button>
    </div>
  </div>
);

export default ActiveTripCard;
