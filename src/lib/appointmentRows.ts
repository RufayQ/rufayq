import type { Appointment } from "@/constants/data";
import type { AppointmentFormData } from "@/components/AppointmentFormSheet";
import type { AppointmentRow } from "@/lib/api/appointmentApi";

const formatDisplayDate = (iso?: string | null) => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatDisplayTime = (iso?: string | null) => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
  appointment_type: data.visitType,
  facility_name: data.hospital || null,
  doctor_name: data.doctorName || null,
  specialty: data.specialty || data.appointmentType,
  location: data.location || data.hospital || null,
  start_at: appointmentStartIso(data.date, data.time),
  notes: data.notes || null,
  source: "manual",
});

export const appointmentRowToAppointment = (row: AppointmentRow, now = new Date()): Appointment => {
  const start = row.start_at ? new Date(row.start_at) : null;
  const type = row.appointment_type === "telemedicine"
    ? "telemedicine"
    : row.appointment_type === "clinic"
      ? "clinic"
      : "in-person";

  return {
    id: row.id,
    doctorName: row.doctor_name || row.facility_name || row.title || "Appointment",
    doctorNameAr: "",
    specialty: row.specialty || row.appointment_type || "Appointment",
    specialtyAr: row.specialty || row.appointment_type || "موعد",
    location: row.location || row.facility_name || (type === "telemedicine" ? "Telemedicine" : "TBD"),
    locationAr: row.location || row.facility_name || (type === "telemedicine" ? "عن بُعد" : "لم يحدد"),
    type,
    date: formatDisplayDate(row.start_at),
    time: formatDisplayTime(row.start_at),
    status: start && start.getTime() < now.getTime() ? "completed" : "upcoming",
    hospital: row.facility_name || undefined,
    hospitalAr: undefined,
    notes: row.notes || undefined,
    notesAr: undefined,
  };
};

export const sortAppointmentRowsByStart = (rows: AppointmentRow[]) =>
  [...rows].sort((a, b) => {
    const aTime = a.start_at ? new Date(a.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.start_at ? new Date(b.start_at).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
