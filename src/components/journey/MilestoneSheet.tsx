import { ArrowUpRight, CalendarClock, ChevronDown, FlaskConical, MoreHorizontal, Pill, PlaneTakeoff, Stethoscope, Activity, FlaskConical as _ } from "lucide-react";
import type { JourneyMilestone } from "@/hooks/useJourneyOverview";
import { formatChipDate } from "@/lib/journeyOverview";
import RelatedDocumentsCard from "@/components/RelatedDocumentsCard";
import { useArtifactCount } from "@/hooks/useArtifactCount";
import { milestoneKeyFor } from "@/lib/records/milestoneKey";
import { useExpandedMilestone } from "@/hooks/useExpandedMilestones";


export type SheetItemKind = "lab" | "rad" | "med" | "visit" | "flight";
export type SheetItemTone = "now" | "active" | "soon" | "done" | "muted";

export interface SheetItem {
  id: string;
  kind: SheetItemKind;
  title: string;
  subtitle?: string;
  state?: string;
  tone?: SheetItemTone;
  cancelled?: boolean;
}

interface MilestoneSheetProps {
  milestone: JourneyMilestone | null;
  items?: SheetItem[];
  location?: string;
  onReschedule?: () => void;
  onOpenMilestone?: () => void;
  onShowAll?: () => void;
  flightTicketId?: string | null;
  flightSegmentRef?: string | null;
  userId?: string | null;
  /** Optional per-traveler upload slots (e.g. boarding pass per passenger).
   *  When provided, each slot becomes its own RelatedDocumentsCard inside the
   *  expanded sheet — keeping files separated per traveler. */
  documentSlots?: Array<{
    segmentRef: string;
    title: string;
    preferredLabels?: string[];
    emptyHint?: { en: string; ar: string };
    /** When true, this slot only shows files whose segment_ref matches exactly
     *  (avoids per-traveler boarding-pass slots echoing other travelers' files
     *  via the shared ticket_id durability branch). Defaults to true. */
    strictSegmentRef?: boolean;
  }>;

  /** Initial expanded state. Defaults to collapsed (false) per design spec. */
  defaultExpanded?: boolean;
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
  if (state === "current") return { label: "Next", bg: "linear-gradient(135deg, rgba(197,150,90,0.18), rgba(197,150,90,0.08))", fg: "var(--gold)", border: "1px solid rgba(197,150,90,0.35)" };
  if (state === "done")    return { label: "Past",  bg: "var(--kind-consult-bg)", fg: "var(--kind-consult-fg)", border: "1px solid transparent" };
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
  documentSlots,
  defaultExpanded = false,
}: MilestoneSheetProps) => {

  // Canonical scope for THIS milestone's attachments. For flight milestones
  // this resolves to the parent ticket; for any other milestone it falls back
  // to a stable milestone-scoped segment_ref so non-flight stops (appointments,
  // surgeries, follow-ups, etc.) also persist documents instead of crashing
  // when the previously flight-only code path was hit.
  const canonical = milestone ? milestoneKeyFor(milestone) : null;
  const resolvedSegmentRef = flightSegmentRef
    ?? (flightTicketId ? `flight-${flightTicketId}` : null)
    ?? canonical?.segmentRef
    ?? null;
  const resolvedTicketId = flightTicketId ?? canonical?.ticketId ?? null;
  const attachmentCount = useArtifactCount({
    userId: userId ?? null,
    segmentRef: resolvedSegmentRef,
    ticketId: resolvedTicketId,
    enabled: !!resolvedSegmentRef || !!resolvedTicketId,
  });
  const [expanded, setExpanded] = useExpandedMilestone(milestone?.id ?? null, defaultExpanded);

  if (!milestone) return null;
  const visible = items.slice(0, 4);
  const overflow = Math.max(0, items.length - visible.length);
  const totalArtifacts = items.length + (resolvedSegmentRef ? attachmentCount : 0);
  const pill = headerPill(milestone.state);
  const dateLabel =
    milestone.state === "current"
      ? `Today · ${milestone.date ? formatChipDate(milestone.date) : ""}`.trim()
      : milestone.date
      ? formatChipDate(milestone.date)
      : "TBD";
  const hasExtraSlots = (documentSlots?.length ?? 0) > 0;
  const hasExpandable = visible.length > 0 || !!resolvedSegmentRef || hasExtraSlots;


  return (
    <section
      className="mx-4 mt-3 stagger-2 relative overflow-hidden"
      data-testid="milestone-sheet"
      aria-label={`${milestone.title} details`}
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #fbfaf6 100%)",
        borderRadius: 20,
        border: "1px solid var(--gray-light)",
        boxShadow: "0 18px 40px -22px rgba(0,77,91,0.22), 0 2px 6px -2px rgba(0,77,91,0.06)",
        padding: "14px 18px 16px",
      }}
    >
      {/* Elite gold accent strip */}
      <div
        aria-hidden
        style={{
          position: "absolute", top: 0, left: 18, right: 18, height: 2,
          background: "linear-gradient(90deg, transparent, var(--gold) 50%, transparent)",
          opacity: 0.55,
        }}
      />
      {/* Drag handle */}
      <div
        aria-hidden
        style={{ width: 34, height: 4, borderRadius: 999, background: "var(--gray-light)", margin: "4px auto 12px" }}
      />

      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="text-[16px] font-semibold leading-tight tracking-[-0.01em] truncate"
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

      {/* Expandable content */}
      {expanded && (
        <>
          {visible.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 animate-fade-in" data-testid="milestone-sheet-items">
              {visible.map((it) => {
                const k = KIND_BG[it.kind];
                const tone = TONE_BG[it.tone ?? "soon"];
                const Icon = k.Icon;
                return (
                  <li
                    key={it.id}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
                    style={{ background: "var(--off-white)", opacity: it.cancelled ? 0.5 : 1 }}
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
                        <p className="text-[10px] truncate" style={{ color: "var(--gray)" }}>{it.subtitle}</p>
                      )}
                    </div>
                    {it.state && (
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: tone.bg, color: tone.fg, border: tone.border, letterSpacing: "0.04em" }}
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

          {hasExtraSlots && (
            <div
              className="mt-3 -mx-2 space-y-2 animate-fade-in"
              data-testid="milestone-sheet-extra-slots"
              onClick={(e) => e.stopPropagation()}
            >
              {documentSlots!.map((slot) => (
                <RelatedDocumentsCard
                  key={slot.segmentRef}
                  segmentRef={slot.segmentRef}
                  ticketId={resolvedTicketId ?? undefined}
                  userId={userId ?? null}
                  title={slot.title}
                  preferredLabels={slot.preferredLabels}
                  emptyHint={slot.emptyHint}
                  strictSegmentRef={slot.strictSegmentRef !== false}
                  compact
                />
              ))}

            </div>
          )}

          {resolvedSegmentRef && (
            <div className="mt-3 -mx-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <RelatedDocumentsCard
                segmentRef={resolvedSegmentRef}
                ticketId={resolvedTicketId ?? undefined}
                userId={userId ?? null}
                // For flight milestones, dedicated per-traveler boarding-pass
                // slots already render boarding passes above. Hide them from
                // the catch-all card so users don't see duplicates.
                excludeSubcategories={hasExtraSlots ? ["Boarding Pass"] : undefined}
                compact
              />
            </div>
          )}


        </>

      )}

      {/* CTAs */}
      <div className="flex gap-1.5 mt-3 items-stretch">
        <button
          onClick={onReschedule}
          disabled={!onReschedule}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold btn-press"
          style={{
            background: "var(--white)",
            border: "1px solid var(--gray-light)",
            color: onReschedule ? "var(--navy)" : "var(--gray)",
            opacity: onReschedule ? 1 : 0.6,
          }}
        >
          <CalendarClock size={12} /> Reschedule
        </button>
        <button
          onClick={onOpenMilestone}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold btn-press text-white"
          style={{
            background: "linear-gradient(135deg, var(--navy) 0%, var(--teal-deep) 100%)",
            boxShadow: "0 6px 14px -6px rgba(0,77,91,0.45)",
          }}
        >
          <ArrowUpRight size={12} /> Open milestone
        </button>
        {hasExpandable && (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse milestone details" : "Expand milestone details"}
            data-testid="milestone-sheet-expand"
            className="flex items-center justify-center rounded-xl btn-press flex-shrink-0"
            style={{
              width: 40,
              background: "var(--white)",
              border: "1px solid var(--gray-light)",
              color: "var(--teal-deep)",
            }}
          >
            <ChevronDown
              size={14}
              style={{ transition: "transform 220ms ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
        )}
      </div>
    </section>
  );
};

export default MilestoneSheet;
