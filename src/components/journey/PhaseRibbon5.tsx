import { PHASES, derivePhase, type Phase } from "@/components/home/journeyPhase";

interface PhaseRibbon5Props {
  dayN: number | null;
  totalDays: number | null;
}

const phaseIndex = (p: Phase) => PHASES.findIndex((x) => x.id === p);

const PhaseRibbon5 = ({ dayN, totalDays }: PhaseRibbon5Props) => {
  const current = derivePhase(dayN, totalDays);
  const currentIdx = phaseIndex(current);

  return (
    <div className="px-4 pt-3" data-testid="phase-ribbon-5">
      <div className="flex gap-[4px]">
        {PHASES.map((p, i) => {
          const state = i < currentIdx ? "done" : i === currentIdx ? "now" : "todo";
          const bg =
            state === "done"
              ? "var(--success)"
              : state === "now"
              ? "linear-gradient(90deg, var(--success) 50%, var(--kind-rad-bg) 50%)"
              : "var(--gray-light)";
          return (
            <div
              key={p.id}
              data-testid={`phase-ribbon-seg-${i}`}
              data-state={state}
              className="flex-1 rounded-[2px]"
              style={{ height: 3, background: bg }}
              aria-label={`${p.en} — ${state}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 px-[1px]">
        {PHASES.map((p, i) => (
          <span
            key={p.id}
            className="font-mono text-[9px] tracking-[0.06em] uppercase"
            style={{
              color: i === currentIdx ? "var(--teal-deep)" : "var(--gray)",
              fontWeight: i === currentIdx ? 700 : 500,
              flex: 1,
              textAlign: i === 0 ? "left" : i === PHASES.length - 1 ? "right" : "center",
            }}
          >
            {p.en}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PhaseRibbon5;
