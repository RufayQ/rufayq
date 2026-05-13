/**
 * UnifiedTimeline — chronological view of flights + appointments for a trip.
 *
 * Real data only. No demo seeding here; callers pass the merged appointment
 * list (self-added + provider-pushed). Empty state when nothing is scheduled.
 */
import type { TripData, FlightInfo } from "@/components/AddTripSheet";

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
}

interface UnifiedTimelineProps {
  activeTrip: TripData | null;
  appointments: AppointmentTimelineInput[];
  onItemTap?: (item: TimelineItem) => void;
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
  };
}

export function buildTimelineItems(
  activeTrip: TripData | null,
  appointments: AppointmentTimelineInput[],
): TimelineItem[] {
  const items: TimelineItem[] = [];
  if (activeTrip?.outboundFlight) {
    const f = flightItem("flight-out", activeTrip.outboundFlight, "Outbound");
    if (f) items.push(f);
  }
  if (activeTrip?.returnFlight) {
    const f = flightItem("flight-return", activeTrip.returnFlight, "Return");
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

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const UnifiedTimeline = ({ activeTrip, appointments, onItemTap }: UnifiedTimelineProps) => {
  const items = buildTimelineItems(activeTrip, appointments);

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
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onItemTap?.(it)}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 card-press text-left"
          style={{
            background: "var(--white)",
            border: "1px solid var(--gray-light)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
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
      ))}
    </div>
  );
};

export default UnifiedTimeline;
