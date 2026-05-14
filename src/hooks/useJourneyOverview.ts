import { useMemo } from "react";
import { useJourneys } from "@/hooks/useJourneys";
import { useAppointments } from "@/hooks/useAppointments";
import { medications as demoMedications, appointments as demoAppointments, type Medication, type Appointment } from "@/constants/data";
import type { TripData } from "@/components/AddTripSheet";
import { appointmentRowToAppointment, sortAppointmentRowsByStart } from "@/lib/appointmentRows";
import { computeProgress, formatDate, parseDate } from "@/lib/journeyOverview";

// Single Berlin demo trip used when isGuest === true. Kept here so HomeScreen
// and JourneyScreen always see the same guest seed.
const guestTrip: TripData = {
  id: "guest-trip-1",
  destination: "Berlin, DE",
  hospital: "Charité Hospital",
  specialty: "Orthopedic Surgery",
  specialtyEmoji: "🦴",
  departureDate: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  returnDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
  treatingDoctor: "Dr. Müller",
  companion: false,
  companionName: "",
  insuranceRef: "",
  status: "active",
  outboundFlight: null,
  returnFlight: null,
};

export interface DashboardMedication {
  id: string;
  name: string;
  nameAr: string;
  status: Medication["status"];
  time: string;
  frequency: string;
}

export type MilestoneSubKind =
  | "consult"
  | "lab"
  | "rad"
  | "flight"
  | "surgery"
  | "recovery"
  | "followup";

export interface JourneyMilestone {
  id: string;
  /** Stable reference back to the source record (appointment id, "departure", "return"). */
  refId: string;
  kind: "departure" | "appointment" | "treatment" | "return" | "followup";
  /** Refined visual taxonomy used by the helicopter canvas. */
  subKind: MilestoneSubKind;
  title: string;
  titleAr: string;
  date?: string | null;
  /** Bucket used for phase-chip placement on the home canvas. */
  phase: "before" | "travel" | "care" | "after";
  state: "done" | "current" | "upcoming";
}

function inferSubKind(kind: JourneyMilestone["kind"], title: string): MilestoneSubKind {
  if (kind === "departure" || kind === "return") return "flight";
  if (kind === "treatment") return "surgery";
  if (kind === "followup") return "followup";
  const t = (title || "").toLowerCase();
  if (/(surger|operation|valve|repair|implant|graft)/.test(t)) return "surgery";
  if (/(icu|ward|recover|rehab|physio)/.test(t)) return "recovery";
  if (/(follow.?up|f\/u)/.test(t)) return "followup";
  if (/(lab|blood|panel|cbc|chem)/.test(t)) return "lab";
  if (/(echo|scan|mri|ct|x.?ray|ultrasound|imaging|radio)/.test(t)) return "rad";
  return "consult";
}

export interface DashboardAlert {
  id: string;
  emoji: string;
  en: string;
  ar: string;
  date?: string;
  color: string;
}

export interface JourneyOverview {
  activeTrip: TripData | null;
  otherTrips: TripData[];
  journeyCount: number;
  totalDays: number | null;
  dayN: number | null;
  daysLeft: number | null;
  progressPct: number;
  formattedDepartureDate: string;
  formattedReturnDate: string;
  nextAppointment: Appointment | null;
  nextMedication: DashboardMedication | null;
  todayMedications: DashboardMedication[];
  upcomingAppointments: Appointment[];
  /** All known appointments (persisted or demo), sorted chronologically. Used to resolve milestone refIds. */
  allAppointments: Appointment[];
  milestones: JourneyMilestone[];
  alerts: DashboardAlert[];
}

function normalizeMed(m: Medication, idx: number): DashboardMedication {
  return { id: `${m.name}-${idx}`, name: m.name, nameAr: m.nameAr, status: m.status, time: m.time, frequency: m.frequency };
}

function buildMilestones(trip: TripData | null, appts: Appointment[]): JourneyMilestone[] {
  if (!trip) return [];
  const todayUTC = new Date();
  const todayKey = `${todayUTC.getUTCFullYear()}-${String(todayUTC.getUTCMonth() + 1).padStart(2, "0")}-${String(todayUTC.getUTCDate()).padStart(2, "0")}`;
  const dep = trip.departureDate;
  const ret = trip.returnDate;
  const stateFor = (date?: string | null): JourneyMilestone["state"] => {
    if (!date) return "upcoming";
    const d = parseDate(date);
    if (!d) return "upcoming";
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    if (key < todayKey) return "done";
    if (key === todayKey) return "current";
    return "upcoming";
  };
  const depDate = parseDate(dep);
  const retDate = parseDate(ret);
  const phaseFor = (date?: string | null, kind?: JourneyMilestone["kind"]): JourneyMilestone["phase"] => {
    if (kind === "departure") return "travel";
    if (kind === "return") return "after";
    if (kind === "treatment") return "care";
    const d = parseDate(date);
    if (!d) return "care";
    if (depDate && d.getTime() < depDate.getTime()) return "before";
    if (retDate && d.getTime() > retDate.getTime()) return "after";
    return "care";
  };

  const items: JourneyMilestone[] = [
    { id: "m-departure", refId: "departure", kind: "departure", subKind: "flight", title: "Departure", titleAr: "السفر", date: dep, state: stateFor(dep), phase: "travel" },
  ];
  appts.slice(0, 3).forEach((apt, i) => {
    const kind: JourneyMilestone["kind"] =
      i === 0 && apt.specialty?.toLowerCase().includes("surg") ? "treatment" : "appointment";
    const title = apt.specialty || apt.doctorName || "Appointment";
    items.push({
      id: `m-appt-${apt.id}`,
      refId: apt.id,
      kind,
      subKind: inferSubKind(kind, title),
      title,
      titleAr: apt.specialtyAr || apt.doctorNameAr || "موعد",
      date: apt.date,
      state: apt.status === "completed" ? "done" : "upcoming",
      phase: phaseFor(apt.date, kind),
    });
  });
  items.push({ id: "m-return", refId: "return", kind: "return", subKind: "flight", title: "Return Home", titleAr: "العودة", date: ret, state: stateFor(ret), phase: "after" });

  // Sort by date so the canvas renders chronologically (departure can be after consults).
  items.sort((a, b) => {
    const da = parseDate(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const db = parseDate(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  });

  // Mark the first non-done as current if nothing is current yet.
  if (!items.some((m) => m.state === "current")) {
    const next = items.find((m) => m.state === "upcoming");
    if (next) next.state = "current";
  }
  return items;
}

export function useJourneyOverview(opts: { isGuest?: boolean } = {}): JourneyOverview {
  const isGuest = !!opts.isGuest;
  const { journeys } = useJourneys(isGuest ? [guestTrip] : []);
  const { items: appointmentRows } = useAppointments();

  return useMemo(() => {
    const activeTrip =
      journeys.find((j) => j.status === "active") ??
      journeys.find((j) => j.status === "upcoming") ??
      null;
    const otherTrips = journeys.filter((j) => j.id !== activeTrip?.id).slice(0, 3);
    const progress = computeProgress(activeTrip?.departureDate, activeTrip?.returnDate);

    const persistedAppointments: Appointment[] = sortAppointmentRowsByStart(appointmentRows).map((row) => appointmentRowToAppointment(row));
    const upcomingAppointments = isGuest
      ? demoAppointments.filter((a) => a.status === "upcoming").slice(0, 3)
      : persistedAppointments.filter((a) => a.status === "upcoming").slice(0, 3);
    const nextAppointment = upcomingAppointments[0] ?? null;

    const sourceMeds = isGuest ? demoMedications.slice(0, 3) : [];
    const todayMedications = sourceMeds.map(normalizeMed);
    const nextMedication =
      todayMedications.find((m) => m.status === "due") ??
      todayMedications.find((m) => m.status === "upcoming") ??
      null;

    const allAppts = isGuest ? demoAppointments : persistedAppointments;
    const milestones = buildMilestones(activeTrip, allAppts);

    const alerts: DashboardAlert[] = [];
    if (activeTrip && progress.daysLeft != null && progress.daysLeft <= 3) {
      alerts.push({
        id: "alert-return-soon",
        emoji: "✈️",
        en: `Return in ${progress.daysLeft} day${progress.daysLeft === 1 ? "" : "s"}`,
        ar: `العودة خلال ${progress.daysLeft} يوم`,
        date: formatDate(activeTrip.returnDate),
        color: "var(--teal-deep)",
      });
    }
    if (nextAppointment) {
      alerts.push({
        id: `alert-appt-${nextAppointment.id}`,
        emoji: "🩺",
        en: `${nextAppointment.specialty} · ${nextAppointment.doctorName}`,
        ar: `${nextAppointment.specialtyAr || ""} · ${nextAppointment.doctorNameAr || ""}`.trim(),
        date: `${nextAppointment.date} · ${nextAppointment.time}`,
        color: "var(--gold)",
      });
    }
    if (nextMedication) {
      alerts.push({
        id: `alert-med-${nextMedication.id}`,
        emoji: "💊",
        en: `${nextMedication.name} due`,
        ar: `${nextMedication.nameAr} — الجرعة القادمة`,
        date: nextMedication.time,
        color: "var(--warning)",
      });
    }

    return {
      activeTrip,
      otherTrips,
      journeyCount: journeys.length,
      totalDays: progress.totalDays,
      dayN: progress.dayN,
      daysLeft: progress.daysLeft,
      progressPct: progress.progressPct,
      formattedDepartureDate: formatDate(activeTrip?.departureDate),
      formattedReturnDate: formatDate(activeTrip?.returnDate),
      nextAppointment,
      nextMedication,
      todayMedications,
      upcomingAppointments,
      allAppointments: allAppts,
      milestones,
      alerts,
    };
  }, [journeys, appointmentRows, isGuest]);
}
