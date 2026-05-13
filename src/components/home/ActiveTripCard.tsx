import { Plus } from "lucide-react";
import type { TripData } from "@/components/AddTripSheet";

interface Props {
  trip: TripData;
  onViewJourney: () => void;
  onNewTrip: () => void;
}

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

const ActiveTripCard = ({ trip, onViewJourney, onNewTrip }: Props) => {
  const start = trip.departureDate ? new Date(trip.departureDate) : null;
  const end = trip.returnDate ? new Date(trip.returnDate) : null;
  const today = new Date();
  const totalDays = start && end ? daysBetween(start, end) : 0;
  const dayN = start ? Math.min(totalDays || 0, daysBetween(start, today)) : 0;
  const daysLeft = totalDays ? Math.max(0, totalDays - dayN) : 0;
  const progressPct = totalDays > 0 ? Math.min(100, Math.round((dayN / totalDays) * 100)) : 0;
  const dest = trip.destination?.toUpperCase() || "TRIP";

  return (
    <div className="rounded-2xl p-5 animate-fade-in-up" style={{ background: "var(--white)", boxShadow: "0 8px 32px rgba(0,77,91,0.14)" }}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--gold)" }}>
            {trip.status === "active" ? "ACTIVE TRIP" : "UPCOMING TRIP"} — {dest}
          </p>
          <p className="font-display text-lg mt-0.5" style={{ color: "var(--navy)" }}>{trip.specialty || "Treatment"}</p>
          <p className="font-arabic text-xs" dir="rtl" style={{ color: "var(--gray)" }}>{trip.hospital || ""}</p>
        </div>
        {totalDays > 0 && (
          <span className="font-mono text-[11px] px-3 py-1 rounded-full" style={{ background: "var(--teal-light)", color: "var(--teal-deep)" }}>
            DAY {dayN} / {totalDays}
          </span>
        )}
      </div>

      <div className="w-full h-1.5 rounded-full mt-3 mb-3" style={{ background: "var(--gray-light)" }}>
        <div
          className="h-1.5 rounded-full animate-progress"
          style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--teal-deep), var(--teal-bright))" }}
        />
      </div>

      <div className="grid grid-cols-3 text-center">
        {[
          { val: `${dayN}`, sub: "Day", subAr: "يوم", color: "var(--success)" },
          { val: `${daysLeft}`, sub: "Days Left", subAr: "أيام متبقية", color: "var(--teal-deep)" },
          { val: `${totalDays}`, sub: "Total", subAr: "إجمالي", color: "var(--gold)" },
        ].map((s, i) => (
          <div key={i} className="relative">
            {i > 0 && <div className="absolute left-0 top-1 bottom-1 w-px" style={{ background: "var(--gray-light)" }} />}
            <p className="font-display text-2xl" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[10px]" style={{ color: "var(--gray)" }}>{s.sub}</p>
            <p className="font-arabic text-[9px]" dir="rtl" style={{ color: "var(--gray)" }}>{s.subAr}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2">
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
};

export default ActiveTripCard;
