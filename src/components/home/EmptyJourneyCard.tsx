import { Plus } from "lucide-react";

interface Props {
  onAddTrip: () => void;
}

const EmptyJourneyCard = ({ onAddTrip }: Props) => (
  <div
    className="rounded-2xl p-6 text-center animate-fade-in-up"
    style={{ background: "var(--white)", boxShadow: "0 8px 32px rgba(0,77,91,0.10)" }}
  >
    <div className="text-4xl mb-2">🌍</div>
    <p className="font-display text-lg" style={{ color: "var(--navy)" }}>No journey yet</p>
    <p className="font-arabic text-xs mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>
      لم تبدأ رحلة علاجية بعد
    </p>
    <p className="text-[12px] mt-2" style={{ color: "var(--gray)" }}>
      Plan your first treatment trip to see it here.
    </p>
    <button
      onClick={onAddTrip}
      className="inline-flex items-center gap-1 mt-4 px-4 py-2 rounded-full text-xs font-semibold btn-press"
      style={{ background: "var(--teal-deep)", color: "#fff" }}
    >
      <Plus size={12} /> Start a new trip
      <span className="font-arabic"> · رحلة جديدة</span>
    </button>
  </div>
);

export default EmptyJourneyCard;
