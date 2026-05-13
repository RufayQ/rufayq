import { describe, expect, it } from "vitest";
import { appointmentFormToRowInput, appointmentRowToAppointment } from "@/lib/appointmentRows";
import type { AppointmentRow } from "@/lib/api/appointmentApi";

const baseRow: AppointmentRow = {
  id: "appt-1",
  patient_id: "patient-1",
  user_id: null,
  device_id: "device-1",
  client_generated_id: null,
  title: "Dr. Care appointment",
  appointment_type: "clinic",
  facility_name: "Care Clinic",
  doctor_name: "Dr. Care",
  specialty: "Cardiology",
  location: "Building A",
  start_at: "2026-06-01T09:30:00.000Z",
  end_at: null,
  notes: "Bring records",
  source: "manual",
  sync_status: "synced",
  version: 1,
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
  deleted_at: null,
};

describe("appointment row mapping", () => {
  it("builds a DB input from appointment form data", () => {
    const input = appointmentFormToRowInput({
      appointmentType: "physician",
      visitType: "clinic",
      specialty: "Cardiology",
      doctorName: "Dr. Care",
      doctorNameAr: "",
      hospital: "Care Clinic",
      hospitalAr: "",
      location: "Building A",
      locationAr: "",
      date: "2026-06-01",
      time: "09:30",
      notes: "Bring records",
      notesAr: "",
    });

    expect(input).toMatchObject({
      title: "Dr. Care appointment",
      appointment_type: "clinic",
      facility_name: "Care Clinic",
      doctor_name: "Dr. Care",
      specialty: "Cardiology",
      location: "Building A",
      notes: "Bring records",
      source: "manual",
    });
    expect(input.start_at).toContain("2026-06-01T09:30");
  });

  it("maps persisted rows to visible appointment cards with derived status", () => {
    const appt = appointmentRowToAppointment(baseRow, new Date("2026-05-13T00:00:00.000Z"));

    expect(appt).toMatchObject({
      id: "appt-1",
      doctorName: "Dr. Care",
      specialty: "Cardiology",
      location: "Building A",
      type: "clinic",
      date: "Jun 1",
      status: "upcoming",
      hospital: "Care Clinic",
      notes: "Bring records",
    });
  });
});
