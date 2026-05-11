import type { TripData, FlightInfo } from "@/components/AddTripSheet";
import type { JourneyStep } from "@/constants/data";
import type { JourneyRow, JourneyStepRow } from "@/lib/api/journeyApi";

const PHASE_BY_TYPE: Record<string, JourneyStep["phase"]> = {
  before: "before",
  during: "during",
  after: "after",
};

export function dbStepToUi(row: JourneyStepRow): JourneyStep & { dbId: string } {
  // UI uses numeric ids; we hash the uuid to a stable positive int via step_order * 1000 + slot.
  // Real persistence uses dbId. Two steps with same step_order are unlikely; we add a small hash fallback.
  const numericId =
    row.step_order * 1000 +
    (parseInt(row.id.replace(/-/g, "").slice(0, 6), 16) % 999);
  return {
    id: numericId,
    dbId: row.id,
    titleEn: row.title,
    titleAr: row.title, // Arabic title not stored in DB yet; reuse English.
    date: row.due_at ? row.due_at.slice(0, 10) : "TBD",
    status: (row.status as JourneyStep["status"]) ?? "pending",
    phase: PHASE_BY_TYPE[row.step_type] ?? "before",
    details: row.description ?? undefined,
    detailsAr: undefined,
  };
}

export function uiStepToDbInput(
  ui: JourneyStep & { dbId?: string },
  journeyId: string,
  patientId: string,
) {
  const phase = ui.phase ?? "before";
  return {
    id: ui.dbId,
    journey_id: journeyId,
    patient_id: patientId,
    step_order: typeof ui.id === "number" ? ui.id : 0,
    step_type: phase,
    title: ui.titleEn || "Untitled",
    description: ui.details ?? null,
    status: ui.status ?? "pending",
    due_at: ui.date && ui.date !== "TBD" ? ui.date : null,
  };
}

export function dbJourneyToTrip(row: JourneyRow): TripData {
  const meta = parseTitleMeta(row.journey_title);
  return {
    id: row.id,
    destination: [row.destination_city, row.destination_country].filter(Boolean).join(", ") || meta.destination || "",
    hospital: meta.hospital || "",
    specialty: meta.specialty || "",
    specialtyEmoji: meta.specialtyEmoji || "🏥",
    departureDate: row.start_date ?? "",
    returnDate: row.expected_return_date ?? "",
    treatingDoctor: meta.doctor || "",
    companion: !!meta.companionName,
    companionName: meta.companionName || "",
    insuranceRef: meta.insuranceRef || "",
    status: (row.status === "active" ? "active" : "upcoming") as TripData["status"],
    outboundFlight: null,
    returnFlight: null,
  };
}

/** Encode trip metadata that isn't a first-class column into journey_title JSON suffix. */
const META_DELIM = "\n::META::";
function parseTitleMeta(title: string): Record<string, string> {
  const idx = title.indexOf(META_DELIM);
  if (idx < 0) return {};
  try {
    return JSON.parse(title.slice(idx + META_DELIM.length));
  } catch {
    return {};
  }
}
function encodeTitleMeta(trip: TripData): string {
  const head = `${trip.destination || "Journey"} — ${trip.hospital || ""}`.trim();
  const meta = {
    destination: trip.destination,
    hospital: trip.hospital,
    specialty: trip.specialty,
    specialtyEmoji: trip.specialtyEmoji,
    doctor: trip.treatingDoctor,
    companionName: trip.companionName,
    insuranceRef: trip.insuranceRef,
  };
  return `${head}${META_DELIM}${JSON.stringify(meta)}`;
}

export function tripToDbJourneyInput(trip: TripData): Partial<JourneyRow> {
  // destination can be "City, Country" or just a string.
  const parts = (trip.destination || "").split(",").map((p) => p.trim()).filter(Boolean);
  const destination_city = parts[0] ?? null;
  const destination_country = parts[1] ?? null;
  return {
    id: trip.id && trip.id.length > 12 && !trip.id.startsWith("trip-") ? trip.id : undefined,
    journey_title: encodeTitleMeta(trip),
    journey_type: "treatment_travel",
    destination_country,
    destination_city,
    start_date: trip.departureDate || null,
    expected_return_date: trip.returnDate || null,
    status: trip.status === "active" ? "active" : "upcoming",
    source: "manual",
  } as Partial<JourneyRow>;
}

export type { FlightInfo };
