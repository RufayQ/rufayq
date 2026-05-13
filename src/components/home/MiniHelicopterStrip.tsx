import type { JourneyMilestone } from "@/hooks/useJourneyOverview";

interface MiniHelicopterStripProps {
  milestones: JourneyMilestone[];
  onSelect: (milestoneId: string) => void;
}

const stateBg = (s: JourneyMilestone["state"]) =>
  s === "done" ? "var(--success)" : s === "current" ? "var(--teal-deep)" : "var(--gray-light)";

const MiniHelicopterStrip = ({ milestones, onSelect }: MiniHelicopterStripProps) => {
  if (milestones.length === 0) return null;
  const compact = milestones.slice(0, 6);
  return (
    <div className="rounded-2xl p-4 stagger-2" style={{ background: "var(--white)", boxShadow: "0 4px 14px rgba(0,77,91,0.08)" }}>
      <p className="font-mono text-[10px] tracking-widest mb-3" style={{ color: "var(--gray)" }}>
        JOURNEY MAP · خريطة الرحلة
      </p>
      <div className="relative flex items-center justify-between">
        <div
          className="absolute left-3 right-3 h-0.5 top-1/2 -translate-y-1/2"
          style={{ background: "var(--gray-light)" }}
        />
        {compact.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="relative z-10 flex flex-col items-center gap-1 btn-press"
            style={{ width: 44 }}
            aria-label={`${m.title} · ${m.titleAr}`}
          >
            <span
              className={m.state === "current" ? "animate-pulse" : ""}
              style={{
                width: 18, height: 18, borderRadius: 9999,
                background: stateBg(m.state),
                boxShadow: m.state === "current" ? "0 0 0 4px rgba(20,89,121,0.18)" : "none",
                border: m.state === "upcoming" ? "1px solid var(--gray)" : "none",
              }}
            />
            <span className="text-[9px] font-semibold truncate w-full text-center" style={{ color: "var(--navy)" }}>
              {m.title.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MiniHelicopterStrip;
