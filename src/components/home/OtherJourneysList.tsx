import type { TripData } from "@/components/AddTripSheet";

<<<<<<< ours
<<<<<<< ours
interface Props {
=======
=======
>>>>>>> theirs
function formatDate(date?: string | null): string {
  if (!date) return "TBD";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface OtherJourneysListProps {
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
  trips: TripData[];
  onSelect: (trip: TripData) => void;
}

<<<<<<< ours
<<<<<<< ours
const OtherJourneysList = ({ trips, onSelect }: Props) => {
  if (trips.length === 0) return null;
=======
const OtherJourneysList = ({ trips, onSelect }: OtherJourneysListProps) => {
  if (trips.length === 0) return null;

>>>>>>> theirs
=======
const OtherJourneysList = ({ trips, onSelect }: OtherJourneysListProps) => {
  if (trips.length === 0) return null;

>>>>>>> theirs
  return (
    <div className="stagger-2">
      <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gray)" }}>OTHER JOURNEYS</p>
      <div className="space-y-2">
        {trips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => onSelect(trip)}
            className="w-full rounded-xl p-3 flex items-center gap-3 text-left card-press"
            style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
          >
<<<<<<< ours
<<<<<<< ours
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: "var(--off-white)" }}>
              {trip.specialtyEmoji || "🧳"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color: "var(--navy)" }}>{trip.destination}</p>
              <p className="text-[10px]" style={{ color: "var(--gray)" }}>{trip.specialty} · {trip.departureDate || ""}</p>
=======
=======
>>>>>>> theirs
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
              style={{ background: "var(--off-white)" }}
            >
              {trip.specialtyEmoji || "🏥"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color: "var(--navy)" }}>{trip.destination || "Journey"}</p>
              <p className="text-[10px]" style={{ color: "var(--gray)" }}>
                {trip.specialty || trip.hospital || "Treatment travel"} · {formatDate(trip.departureDate)}
              </p>
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
            </div>
            <span
              className="font-mono text-[8px] px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(61,170,110,0.1)", color: "var(--success)" }}
            >
<<<<<<< ours
<<<<<<< ours
              {trip.status === "active" ? "ACTIVE" : "UPCOMING"}
=======
              {trip.status.toUpperCase()}
>>>>>>> theirs
=======
              {trip.status.toUpperCase()}
>>>>>>> theirs
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default OtherJourneysList;
