import { ArrowUpRight, CalendarClock, FlaskConical, Home, MoreHorizontal, Pill, PlaneTakeoff, Stethoscope, Activity } from "lucide-react";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";
import { formatChipDate } from "@/lib/journeyOverview";
import RelatedDocumentsCard from "@/components/RelatedDocumentsCard";
import { useArtifactCount } from "@/hooks/useArtifactCount";

export type SheetItemKind = "lab" | "rad" | "med" | "visit" | "flight";
export type SheetItemTone = "now" | "active" | "soon" | "done" | "muted";

export interface SheetItem {
  id: string;
  kind: SheetItemKind;
  title: string;
  subtitle?: string;
  state?: string;        // e.g. "Now", "14:00", "Pending"
  tone?: SheetItemTone;
  cancelled?: boolean;
}

interface MilestoneSheetProps {
  milestone: JourneyMilestone | null;
  items?: SheetItem[];
  /** Optional location label rendered in the sub-meta row. */
  location?: string;
  onReschedule?: () => void;
  onOpenMilestone?: () => void;
  onShowAll?: () => void;
  /** Flight ticket id for the milestone (departure/return) — when provided,
   *  the sheet renders an inline per-ticket attachments panel so each ticket
   *  keeps its own documents without leaving the sheet. */
  flightTicketId?: string | null;
  /** Optional segment ref backing the ticket — falls back to `flight-<ticketId>`. */
  flightSegmentRef?: string | null;
  /** Current signed-in user id (null/undefined ⇒ device-scoped). */
  userId?: string | null;
}

const KIND_BG: Record<SheetItemKind, { bg: string; fg: string; Icon: any }> = {
  lab:    { bg: "var(--kind-lab-bg)",      fg: "var(--kind-lab-fg)",      Icon: FlaskConical },
  rad:    { bg: "var(--kind-rad-bg)",      fg: "var(--kind-rad-fg)",      Icon: Activity },
  med:    { bg: "var(--gold-pale)",        fg: "var(--gold)",             Icon: Pill },
  visit:  { bg: "var(--kind-consult-bg)",  fg: "var(--kind-consult-fg)",  Icon: Stethoscope },
  flight: { bg: "var(--kind-flight-bg)",   fg: "var(--kind-flight-fg)",   Icon: PlaneTakeoff },
};

const TONE_BG: Record<SheetItemTone, { bg: string; fg: string; border?: string }> = {
  now:    { bg: "var(--kind-rad-bg)",     fg: "var(--kind-rad-fg)" },
  active: { bg: "var(--kind-rad-bg)",     fg: "var(--kind-rad-fg)" },
  soon:   { bg: "var(--white)",           fg: "var(--gray)", border: "1px solid var(--gray-light)" },
  done:   { bg: "var(--kind-consult-bg)", fg: "var(--kind-consult-fg)" },
  muted:  { bg: "var(--off-white)",       fg: "var(--gray)" },
};

const headerPill = (state: JourneyMilestone["state"]) => {
  if (state === "current") return { label: "Today", bg: "var(--kind-rad-bg)", fg: "var(--kind-rad-fg)" };
  if (state === "done")    return { label: "Past",  bg: "var(--kind-consult-bg)", fg: "var(--kind-consult-fg)" };
  return                       { label: "Upcoming", bg: "var(--off-white)", fg: "var(--gray)", border: "1px solid var(--gray-light)" };
};

const MilestoneSheet = ({
  milestone,
  items = [],
  location,
  onReschedule,
  onOpenMilestone,
  onShowAll,
  flightTicketId,
  flightSegmentRef,
  userId,
}: MilestoneSheetProps) => {
  // Hooks must run unconditionally — call before any early return.
  const attachmentCount = useArtifactCount({
    userId: userId ?? null,
    segmentRef: flightSegmentRef || (flightTicketId ? `flight-${flightTicketId}` : null),
    ticketId: flightTicketId ?? null,
  });

  if (!milestone) return null;
  const visible = items.slice(0, 4);
  const overflow = Math.max(0, items.length - visible.length);
  const totalArtifacts = items.length + (flightTicketId ? attachmentCount : 0);
  const pill = headerPill(milestone.state);
  const dateLabel =
    milestone.state === "current"
      ? `Today · ${milestone.date ? formatChipDate(milestone.date) : ""}`.trim()
      : milestone.date
      ? formatChipDate(milestone.date)
      : "TBD";

  return (
    <section
      className="mx-4 mt-3 stagger-2"
      data-testid="milestone-sheet"
      aria-label={`${milestone.title} details`}
      style={{
        background: "var(--white)",
        borderRadius: 18,
        border: "1px solid var(--gray-light)",
        boxShadow: "0 12px 28px -16px rgba(0,77,91,0.18)",
        padding: "12px 18px 18px",
      }}
    >
      {/* Drag handle */}
      <div
        aria-hidden
        style={{ width: 34, height: 4, borderRadius: 999, background: "var(--gray-light)", margin: "0 auto 10px" }}
      />

      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-[15px] font-semibold leading-tight tracking-[-0.01em] truncate"
            style={{ color: "var(--navy)", fontFamily: "var(--font-display)" }}
          >
            {milestone.title}
          </h3>
          <p
            className="font-arabic text-[11px] mt-0.5 truncate"
            dir="rtl"
            style={{ color: "var(--gray)" }}
          >
            {milestone.titleAr}
          </p>
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-1.5 text-[11px]" style={{ color: "var(--gray)" }}>
            <span>{dateLabel}</span>
            <span className="inline-block w-[2px] h-[2px] rounded-full" style={{ background: "var(--gray-light)" }} />
            <span>{totalArtifacts} {totalArtifacts === 1 ? "artifact" : "artifacts"}</span>
            {location && (
              <>
                <span className="inline-block w-[2px] h-[2px] rounded-full" style={{ background: "var(--gray-light)" }} />
                <span className="truncate max-w-[120px]">{location}</span>
              </>
            )}
          </div>
        </div>
        <span
          data-testid="milestone-sheet-pill"
          className="text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: pill.bg, color: pill.fg, border: pill.border, letterSpacing: "0.04em" }}
        >
          {pill.label}
        </span>
      </header>

      {/* Artifacts */}
      {visible.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5" data-testid="milestone-sheet-items">
          {visible.map((it) => {
            const k = KIND_BG[it.kind];
            const tone = TONE_BG[it.tone ?? "soon"];
            const Icon = k.Icon;
            return (
              <li
                key={it.id}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
                style={{
                  background: "var(--off-white)",
                  opacity: it.cancelled ? 0.5 : 1,
                }}
              >
                <span
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 24, height: 24, borderRadius: 6, background: k.bg, color: k.fg }}
                  aria-hidden
                >
                  <Icon size={12} strokeWidth={2.2} />
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11px] font-medium leading-tight truncate"
                    style={{ color: "var(--navy)", textDecoration: it.cancelled ? "line-through" : undefined }}
                  >
                    {it.title}
                  </p>
                  {it.subtitle && (
                    <p className="text-[10px] truncate" style={{ color: "var(--gray)" }}>
                      {it.subtitle}
                    </p>
                  )}
                </div>
                {it.state && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: tone.bg,
                      color: tone.fg,
                      border: tone.border,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {it.state}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {overflow > 0 && (
        <button
          onClick={onShowAll}
          className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium py-1.5 rounded-md btn-press"
          style={{ color: "var(--teal-deep)", background: "var(--off-white)" }}
        >
          <MoreHorizontal size={12} /> +{overflow} more
        </button>
      )}

      {/* Per-ticket attachments (flight milestones only). Each ticket id keeps
       *  its own document scope so a user with 3 tickets sees 3 distinct sets. */}
      {flightTicketId && (
        <div className="mt-3 -mx-2">
          <RelatedDocumentsCard
            segmentRef={flightSegmentRef || `flight-${flightTicketId}`}
            ticketId={flightTicketId}
            userId={userId ?? null}
            compact
          />
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-1.5 mt-3">
        <button
          onClick={onReschedule}
          disabled={!onReschedule}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold btn-press"
          style={{
            background: "transparent",
            border: "1px solid var(--gray-light)",
            color: onReschedule ? "var(--navy)" : "var(--gray)",
            opacity: onReschedule ? 1 : 0.6,
          }}
        >
          <CalendarClock size={12} /> Reschedule
        </button>
        <button
          onClick={onOpenMilestone}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold btn-press"
          style={{ background: "var(--kind-rad-fg)", color: "#fff", border: "1px solid var(--kind-rad-fg)" }}
        >
          <ArrowUpRight size={12} /> Open milestone
        </button>
      </div>
    </section>
  );
};

export default MilestoneSheet;
