/**
 * UnifiedTimeline — chronological view of flights + appointments for a trip.
 *
 * Real data only. No demo seeding here; callers pass the merged appointment
 * list (self-added + provider-pushed). Empty state when nothing is scheduled.
 *
 * Each row is expandable (chevron) to reveal a StepDetailsPanel with per-step
 * attachments and timestamped notes. The existing onItemTap behavior is
 * preserved: tapping the row body still fires onItemTap; the chevron is a
 * separate control that only toggles expansion.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { TripData, FlightInfo } from "@/components/AddTripSheet";
import StepDetailsPanel from "@/components/timeline/StepDetailsPanel";

export type AppointmentKind = "physician" | "lab" | "radiology" | "appointment";

export interface AppointmentTimelineInput {
  id: string;
  kind: AppointmentKind;
  /** ISO datetime string. */
  whenIso?: string | null;
  title: string;
  subtitle?: string;
  source?: "self" | "provider";
}

export interface TimelineItem {
  id: string;
  kind: "flight" | AppointmentKind;
  when: Date;
  title: string;
  subtitle?: string;
  icon: string;
  accent: string;
  source?: "self" | "provider" | "trip";
  /** Sub-kind for stable step_ref building (outbound/return for flights). */
  flightLeg?: "outbound" | "return";
}

interface UnifiedTimelineProps {
  activeTrip: TripData | null;
  appointments: AppointmentTimelineInput[];
  onItemTap?: (item: TimelineItem) => void;
  /** Current auth user id. Pass null for guests. */
  userId?: string | null;
}

const ACCENT: Record<TimelineItem["kind"], string> = {
  flight: "var(--teal-deep)",
  physician: "var(--gold)",
  lab: "var(--success)",
  radiology: "var(--teal-mid)",
  appointment: "var(--gold)",
};

const ICON: Record<TimelineItem["kind"], string> = {
  flight: "✈️",
  physician: "🩺",
  lab: "🔬",
  radiology: "🩻",
  appointment: "📅",
};

function flightItem(
  id: string,
  flight: FlightInfo,
  label: string,
  leg: "outbound" | "return",
): TimelineItem | null {
  const iso = flight.departureDateTime;
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return {
    id,
    kind: "flight",
    when: d,
    title: `${label} · ${flight.airline} ${flight.flightNumber}`,
    subtitle: `${flight.fromCity || flight.fromAirport} → ${flight.toCity || flight.toAirport}`,
    icon: ICON.flight,
    accent: ACCENT.flight,
    source: "trip",
    flightLeg: leg,
  };
}

export function buildTimelineItems(
  activeTrip: TripData | null,
  appointments: AppointmentTimelineInput[],
): TimelineItem[] {
  const items: TimelineItem[] = [];
  if (activeTrip?.outboundFlight) {
    const f = flightItem("flight-out", activeTrip.outboundFlight, "Outbound", "outbound");
    if (f) items.push(f);
  }
  if (activeTrip?.returnFlight) {
    const f = flightItem("flight-return", activeTrip.returnFlight, "Return", "return");
    if (f) items.push(f);
  }
  for (const a of appointments) {
    if (!a.whenIso) continue;
    const d = new Date(a.whenIso);
    if (isNaN(d.getTime())) continue;
    items.push({
      id: a.id,
      kind: a.kind,
      when: d,
      title: a.title,
      subtitle: a.subtitle,
      icon: ICON[a.kind] || ICON.appointment,
      accent: ACCENT[a.kind] || ACCENT.appointment,
      source: a.source,
    });
  }
  items.sort((x, y) => x.when.getTime() - y.when.getTime());
  return items;
}

/** Build a stable per-step reference string for attachments / notes. */
export function buildStepRef(item: TimelineItem, tripId: string | null | undefined): string {
  const trip = tripId || "no-trip";
  if (item.kind === "flight") {
    return `journey:${trip}:flight:${item.flightLeg ?? "unknown"}`;
  }
  return `journey:${trip}:appointment:${item.id}`;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const UnifiedTimeline = ({ activeTrip, appointments, onItemTap, userId }: UnifiedTimelineProps) => {
  const items = buildTimelineItems(activeTrip, appointments);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
      >
        <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>
          No timeline items yet
        </p>
        <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>
          لا توجد عناصر في الجدول الزمني بعد
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-[9px] tracking-widest" style={{ color: "var(--teal-deep)" }}>
        JOURNEY TIMELINE
      </p>
      {items.map((it) => {
        const isExpanded = expandedId === it.id;
        const stepRef = buildStepRef(it, activeTrip?.id);
        return (
          <div
            key={it.id}
            className="rounded-2xl"
            style={{
              background: "var(--white)",
              border: "1px solid var(--gray-light)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => onItemTap?.(it)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left card-press rounded-xl"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                  style={{ background: "var(--off-white)", color: it.accent }}
                >
                  {it.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--navy)" }}>
                      {it.title}
                    </p>
                    {it.source === "provider" && (
                      <span
                        className="font-mono text-[8px] px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "var(--gold-pale)", color: "var(--gold)" }}
                      >
                        FROM PROVIDER
                      </span>
                    )}
                  </div>
                  {it.subtitle && (
                    <p className="text-[10px] truncate" style={{ color: "var(--gray)" }}>
                      {it.subtitle}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[10px]" style={{ color: it.accent }}>
                    {fmtDate(it.when)}
                  </p>
                  <p className="font-mono text-[9px]" style={{ color: "var(--gray)" }}>
                    {fmtTime(it.when)}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : it.id)}
                aria-label={isExpanded ? "Collapse step details" : "Expand step details"}
                aria-expanded={isExpanded}
                className="p-1.5 rounded-lg shrink-0"
                style={{ color: "var(--teal-deep)" }}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            {isExpanded && (
              <div className="px-3 pb-3">
                <StepDetailsPanel stepRef={stepRef} timelineKind="journey" userId={userId} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default UnifiedTimeline;
