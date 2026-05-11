/**
 * Unit tests for medication reminder helpers.
 * Native scheduling is covered indirectly via the web fallback path
 * (isNative is false in jsdom). We focus on:
 *  - reminderId stability + positivity.
 *  - parsing/skipping of malformed times.
 *  - nextDueAt picks the soonest upcoming slot across meds and rolls
 *    past times into "tomorrow".
 *  - syncMedicationReminders returns [] when there are no schedulable rows.
 */
import { describe, it, expect, vi } from "vitest";
import {
  reminderId,
  nextDueAt,
  syncMedicationReminders,
} from "@/lib/native/medicationReminders";
import type { MedicationRow } from "@/lib/api/medicationApi";

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: async () => ({ display: "granted" }),
    requestPermissions: async () => ({ display: "granted" }),
    schedule: async () => ({}),
    cancel: async () => ({}),
  },
}));

function makeRow(overrides: Partial<MedicationRow> = {}): MedicationRow {
  return {
    id: "m1",
    patient_id: null,
    user_id: null,
    device_id: null,
    client_generated_id: null,
    medication_name: "Med",
    dose: "10mg",
    route: null,
    frequency: "Once daily",
    start_date: null,
    end_date: null,
    instructions: null,
    prescribing_doctor: null,
    reminder_enabled: true,
    reminder_times: ["08:00"],
    source: "manual",
    sync_status: "synced",
    version: 1,
    created_at: "",
    updated_at: "",
    deleted_at: null,
    ...overrides,
  };
}

describe("reminderId", () => {
  it("is stable for the same input", () => {
    expect(reminderId("m1", "08:00")).toBe(reminderId("m1", "08:00"));
  });
  it("differs for different inputs", () => {
    expect(reminderId("m1", "08:00")).not.toBe(reminderId("m1", "20:00"));
  });
  it("returns a positive int", () => {
    const id = reminderId("m1", "08:00");
    expect(id).toBeGreaterThan(0);
    expect(Number.isInteger(id)).toBe(true);
  });
});

describe("nextDueAt", () => {
  it("returns null when there are no schedulable meds", () => {
    expect(nextDueAt([])).toBeNull();
    expect(nextDueAt([makeRow({ reminder_enabled: false })])).toBeNull();
    expect(nextDueAt([makeRow({ reminder_times: [] })])).toBeNull();
    expect(nextDueAt([makeRow({ deleted_at: "2024-01-01" })])).toBeNull();
  });

  it("picks the soonest upcoming slot today", () => {
    const now = new Date("2025-01-01T07:00:00");
    const result = nextDueAt(
      [
        makeRow({ id: "a", reminder_times: ["20:00"] }),
        makeRow({ id: "b", reminder_times: ["08:00"] }),
      ],
      now,
    );
    expect(result?.med.id).toBe("b");
  });

  it("rolls a past time into tomorrow", () => {
    const now = new Date("2025-01-01T22:00:00");
    const result = nextDueAt([makeRow({ reminder_times: ["08:00"] })], now);
    expect(result).not.toBeNull();
    expect(result!.at).toBeGreaterThan(now.getTime());
  });

  it("ignores malformed reminder_times entries", () => {
    const now = new Date("2025-01-01T07:00:00");
    const result = nextDueAt(
      [makeRow({ reminder_times: ["nope", "25:99", "08:00"] })],
      now,
    );
    expect(result).not.toBeNull();
  });
});

describe("syncMedicationReminders (web fallback)", () => {
  it("returns [] when there is nothing to schedule", async () => {
    const ids = await syncMedicationReminders([]);
    expect(ids).toEqual([]);
  });
  it("returns the next-due id when there is a schedulable med", async () => {
    const ids = await syncMedicationReminders([makeRow()]);
    expect(ids.length).toBe(1);
  });
});
