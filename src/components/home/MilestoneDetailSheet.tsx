import { ChevronRight } from "lucide-react";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";

interface MilestoneDetailSheetProps {
  milestone: JourneyMilestone | null;
  /** Optional secondary lines (sub-items) to render under the title. */
  items?: { id: string; label: string; sub?: string; tag?: string; tone?: "active" | "now" | "muted" }[];
  onOpen: () => void;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const toneStyle = (tone?: "active" | "now" | "muted") => {
  if (tone === "now") return { bg: "var(--teal-light)", fg: "var(--teal-deep)" };
  if (tone === "active") return { bg: "var(--gold-pale)", fg: "var(--gold)" };
  return { bg: "var(--off-white)", fg: "var(--gray)" };
};

const MilestoneDetailSheet = ({ milestone, items = [], onOpen }: MilestoneDetailSheetProps) => {
  if (!milestone) return null;
  const tagText =
    milestone.state === "current" ? "Today" :
    milestone.state === "done" ? "Done" :
    "Upcoming";
  const tagBg =
    milestone.state === "current" ? "var(--teal-light)" :
    milestone.state === "done" ? "rgba(61,170,110,0.15)" :
    "var(--off-white)";
  const tagFg =
    milestone.state === "current" ? "var(--teal-deep)" :
    milestone.state === "done" ? "var(--success)" :
    "var(--gray)";

  return (
    <section
      className="rounded-[22px] overflow-hidden stagger-3"
      style={{
        background: "var(--white)",
        border: "1px solid var(--gray-light)",
        boxShadow: "0 12px 28px -16px rgba(0,77,91,0.18)",
      }}
      aria-label="Selected milestone details"
    >
      <header className="flex items-start justify-between px-4 pt-4">
        <div className="min-w-0">
          <h3
            className="text-[16px] font-semibold tracking-[-0.01em] truncate"
            style={{ color: "var(--navy)", fontFamily: "var(--font-display)" }}
          >
            {milestone.title}
          </h3>
          <p
            className="font-arabic text-[12px] mt-0.5 truncate"
            dir="rtl"
            style={{ color: "var(--gray)" }}
          >
            {milestone.titleAr}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="font-mono text-[10px] tracking-[0.14em]"
              style={{ color: "var(--gray)" }}
            >
              {formatDate(milestone.date) || "—"}
            </span>
            {items.length > 0 && (
              <>
                <span style={{ color: "var(--gray-light)" }}>·</span>
                <span
                  className="font-mono text-[10px] tracking-[0.14em]"
                  style={{ color: "var(--gray)" }}
                >
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </>
            )}
          </div>
        </div>
        <span
          className="px-2.5 py-1 rounded-full font-mono text-[10px] tracking-[0.16em] flex-shrink-0"
          style={{ background: tagBg, color: tagFg }}
        >
          {tagText}
        </span>
      </header>

      {items.length > 0 && (
        <ul className="mt-3 px-3 pb-2 space-y-1.5">
          {items.map((it) => {
            const t = toneStyle(it.tone);
            return (
              <li
                key={it.id}
                className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background: "var(--off-white)" }}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: "var(--navy)" }}>
                    {it.label}
                  </p>
                  {it.sub && (
                    <p className="text-[11px] truncate" style={{ color: "var(--gray)" }}>
                      {it.sub}
                    </p>
                  )}
                </div>
                {it.tag && (
                  <span
                    className="px-2 py-0.5 rounded-full font-mono text-[9.5px] tracking-[0.14em] flex-shrink-0 ml-2"
                    style={{ background: t.bg, color: t.fg }}
                  >
                    {it.tag}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={onOpen}
        className="w-full flex items-center justify-between px-4 py-3 mt-1 active:opacity-80"
        style={{ borderTop: "1px solid var(--gray-light)" }}
      >
        <span
          className="font-mono text-[10px] tracking-[0.18em]"
          style={{ color: "var(--teal-deep)" }}
        >
          OPEN IN JOURNEY · افتح في الرحلة
        </span>
        <ChevronRight size={16} color="var(--teal-deep)" />
      </button>
    </section>
  );
};

export default MilestoneDetailSheet;
