<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
import { Plus, Sparkles } from "lucide-react";

interface EmptyJourneyCardProps {
  onAddTrip: () => void;
}

const EmptyJourneyCard = ({ onAddTrip }: EmptyJourneyCardProps) => (
  <div
    className="rounded-2xl p-6 text-center animate-fade-in-up"
    style={{ background: "var(--white)", boxShadow: "0 8px 32px rgba(0,77,91,0.14)" }}
  >
    <div
      className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3"
      style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)" }}
    >
      <Sparkles size={26} color="var(--gold)" />
    </div>
    <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>FRESH START · بداية جديدة</p>
    <h2 className="font-display text-lg" style={{ color: "var(--navy)" }}>Your app is ready</h2>
    <p className="font-arabic text-xs mt-0.5" dir="rtl" style={{ color: "var(--teal-deep)" }}>تطبيقك جاهز للاستخدام</p>
    <p className="text-[12px] mt-3 leading-relaxed" style={{ color: "var(--gray)" }}>
      No journeys yet. Add your first trip, scan a document, or ask the AI assistant anything.
    </p>
    <p className="font-arabic text-[11px] mt-1 leading-relaxed" dir="rtl" style={{ color: "var(--gray)" }}>
      لا توجد رحلات بعد. أضف رحلتك الأولى أو امسح وثيقة أو اسأل المساعد الذكي.
    </p>
    <button
      onClick={onAddTrip}
      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white btn-press"
      style={{ background: "linear-gradient(135deg, var(--teal-deep), var(--teal-mid))" }}
    >
      <Plus size={14} /> Add your first trip
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
    </button>
  </div>
);

export default EmptyJourneyCard;
