import type { Appointment } from "@/constants/data";
import type { AppointmentFormData } from "@/components/AppointmentFormSheet";
import type { AppointmentRow } from "@/lib/api/appointmentApi";

export type AppointmentKind = "physician" | "lab" | "radiology" | "appointment";
export type VisitType = "in-person" | "telemedicine" | "clinic";

export interface ProviderAppointmentRow {
  id: string;
  organization_id?: string;
  patient_device_id?: string;
  author_id?: string | null;
  title: string;
  location: string | null;
  scheduled_at: string | null;
  notes: string | null;
  status: string;
  appointment_type: string | null;
  visit_type: string | null;
  created_at?: string;
}

export interface AppointmentCardModel extends Appointment {
  appointmentType: AppointmentKind;
  visitType: VisitType;
  whenIso: string | null;
  source: "self" | "provider";
}

export interface FormatWhenResult {
  date: string;
  time: string;
  valid: boolean;
  dateObj: Date | null;
}

export const formatWhen = (iso?: string | null): FormatWhenResult => {
  if (!iso) return { date: "TBD", time: "TBD", valid: false, dateObj: null };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "TBD", time: "TBD", valid: false, dateObj: null };
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: undefined as unknown as string }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: undefined as unknown as string }).format(d);
  return { date, time, valid: true, dateObj: d };
};

export const appointmentTypeLabel = (kind?: string | null) => {
  switch (kind) {
    case "physician": return { en: "Physician", ar: "طبيب", icon: "🩺" };
    case "lab": return { en: "Lab", ar: "مختبر", icon: "🔬" };
    case "radiology": return { en: "Radiology", ar: "أشعة", icon: "🩻" };
    default: return { en: "Appointment", ar: "موعد", icon: "📅" };
  }
};

export const visitTypeLabel = (visit?: string | null) => {
  switch (visit) {
    case "telemedicine": return { en: "Telemedicine", ar: "عن بُعد", icon: "💻" };
    case "clinic": return { en: "Clinic", ar: "عيادة", icon: "🏢" };
    case "in-person":
    default: return { en: "In-person", ar: "حضوري", icon: "🏥" };
  }
};

export const appointmentStartIso = (date: string, time: string) => {
  if (!date) return null;
  const d = new Date(`${date}T${time || "00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const appointmentTitleFromForm = (data: AppointmentFormData) => {
  const careLabel = data.doctorName || data.hospital || data.specialty || data.appointmentType;
  return `${careLabel} appointment`.trim();
};

export const appointmentFormToRowInput = (data: AppointmentFormData): Partial<AppointmentRow> => ({
  title: appointmentTitleFromForm(data),
  appointment_type: data.appointmentType,
  visit_type: data.visitType,
  facility_name: data.hospital || null,
  doctor_name: data.doctorName || null,
  specialty: data.specialty || data.appointmentType,
  location: data.location || data.hospital || null,
  start_at: appointmentStartIso(data.date, data.time),
  notes: data.notes || null,
  source: "manual",
});

const normalizeKind = (k?: string | null): AppointmentKind =>
  k === "physician" || k === "lab" || k === "radiology" ? k : "appointment";

const normalizeVisit = (v?: string | null): VisitType =>
  v === "telemedicine" || v === "clinic" || v === "in-person" ? v : "in-person";

const visitToCardType = (v: VisitType): Appointment["type"] =>
  v === "telemedicine" ? "telemedicine" : v === "clinic" ? "clinic" : "in-person";

export const dbAppointmentToCard = (row: AppointmentRow, now = new Date()): AppointmentCardModel => {
  const fw = formatWhen(row.start_at);
  const kind = normalizeKind(row.appointment_type);
  const visit = normalizeVisit(row.visit_type);
  const status: Appointment["status"] = !fw.valid
    ? "upcoming"
    : fw.dateObj!.getTime() < now.getTime()
      ? "completed"
      : "upcoming";
  return {
    id: row.id,
    doctorName: row.doctor_name || row.facility_name || row.title || "Appointment",
    doctorNameAr: "",
    specialty: row.specialty || kind,
    specialtyAr: row.specialty || kind,
    location: row.location || row.facility_name || (visit === "telemedicine" ? "Telemedicine" : "TBD"),
    locationAr: row.location || row.facility_name || (visit === "telemedicine" ? "عن بُعد" : "لم يحدد"),
    type: visitToCardType(visit),
    date: fw.date,
    time: fw.time,
    status,
    hospital: row.facility_name || undefined,
    hospitalAr: undefined,
    notes: row.notes || undefined,
    notesAr: undefined,
    appointmentType: kind,
    visitType: visit,
    whenIso: row.start_at || null,
    source: "self",
  };
};

export const providerRowToCard = (row: ProviderAppointmentRow, now = new Date()): AppointmentCardModel => {
  const fw = formatWhen(row.scheduled_at);
  const kind = normalizeKind(row.appointment_type);
  const visit = normalizeVisit(row.visit_type);
  const status: Appointment["status"] = !fw.valid
    ? "upcoming"
    : fw.dateObj!.getTime() < now.getTime()
      ? "completed"
      : "upcoming";
  return {
    id: row.id,
    doctorName: row.title || "Provider appointment",
    doctorNameAr: "",
    specialty: kind,
    specialtyAr: kind,
    location: row.location || (visit === "telemedicine" ? "Telemedicine" : "TBD"),
    locationAr: row.location || (visit === "telemedicine" ? "عن بُعد" : "لم يحدد"),
    type: visitToCardType(visit),
    date: fw.date,
    time: fw.time,
    status,
    hospital: undefined,
    hospitalAr: undefined,
    notes: row.notes || undefined,
    notesAr: undefined,
    appointmentType: kind,
    visitType: visit,
    whenIso: row.scheduled_at || null,
    source: "provider",
  };
};

// Backwards-compatible alias.
export const appointmentRowToAppointment = dbAppointmentToCard;

export const sortAppointmentRowsByStart = (rows: AppointmentRow[]) =>
  [...rows].sort((a, b) => {
    const aTime = a.start_at ? new Date(a.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.start_at ? new Date(b.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

export const sortAppointmentCards = (cards: AppointmentCardModel[]) =>
  [...cards].sort((a, b) => {
    const aT = a.whenIso ? new Date(a.whenIso).getTime() : Number.MAX_SAFE_INTEGER;
    const bT = b.whenIso ? new Date(b.whenIso).getTime() : Number.MAX_SAFE_INTEGER;
    if (aT !== bT) return aT - bT;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
