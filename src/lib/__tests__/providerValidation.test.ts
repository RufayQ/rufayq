import { describe, it, expect } from "vitest";
import {
  validatePatientLink, validateInstruction, validateMedUpdate, validateAppointment,
  validateClaimLine, validateClaimSubmit, validatePayment, validateDenial, validateAppeal,
  validateAuthorizationSubmit, validateDischargeAdvance, validatePatientSearch,
  hasBlockingErrors, fieldErrorMap,
} from "../providerValidation";

describe("providerValidation — patient link", () => {
  it("requires device id", () => {
    const r = validatePatientLink({});
    expect(hasBlockingErrors(r)).toBe(true);
    expect(fieldErrorMap(r).patient_device_id).toBeDefined();
  });
  it("rejects invalid device id format", () => {
    expect(hasBlockingErrors(validatePatientLink({ patient_device_id: "abc" }))).toBe(true);
    expect(hasBlockingErrors(validatePatientLink({ patient_device_id: "valid_device_123" }))).toBe(false);
  });
  it("validates email and phone when present", () => {
    const r = validatePatientLink({
      patient_device_id: "abcdefgh1234", patient_email: "no-at", patient_phone: "12",
    });
    expect(fieldErrorMap(r).patient_email).toBeDefined();
    expect(fieldErrorMap(r).patient_phone).toBeDefined();
  });
  it("accepts E.164 phone", () => {
    const r = validatePatientLink({ patient_device_id: "abcdefgh1234", patient_phone: "+966501234567" });
    expect(hasBlockingErrors(r)).toBe(false);
  });
});

describe("providerValidation — instruction", () => {
  it("requires title and body", () => {
    const r = validateInstruction({});
    expect(fieldErrorMap(r).title).toBeDefined();
    expect(fieldErrorMap(r).body).toBeDefined();
  });
  it("caps body at 2000", () => {
    const r = validateInstruction({ title: "t", body: "x".repeat(2001) });
    expect(fieldErrorMap(r).body).toBeDefined();
  });
  it("rejects unknown priority", () => {
    const r = validateInstruction({ title: "t", body: "b", priority: "urgent" });
    expect(fieldErrorMap(r).priority).toBeDefined();
  });
});

describe("providerValidation — med update", () => {
  it("requires dose and frequency on add", () => {
    const r = validateMedUpdate({ action: "add", med_name: "Aspirin" });
    expect(fieldErrorMap(r).dose).toBeDefined();
    expect(fieldErrorMap(r).frequency).toBeDefined();
  });
  it("does not require dose on stop", () => {
    const r = validateMedUpdate({ action: "stop", med_name: "Aspirin" });
    expect(hasBlockingErrors(r)).toBe(false);
  });
});

describe("providerValidation — appointment", () => {
  it("rejects far past dates", () => {
    const r = validateAppointment({ title: "Visit", scheduled_at: "2020-01-01T10:00:00Z" });
    expect(fieldErrorMap(r).scheduled_at).toBeDefined();
  });
  it("accepts future date", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(hasBlockingErrors(validateAppointment({ title: "Visit", scheduled_at: future }))).toBe(false);
  });
});

describe("providerValidation — claim line / submit", () => {
  it("rejects bad service code", () => {
    const r = validateClaimLine({ service_code: "x", service_name: "n", qty: 1, unit_price: 1 });
    expect(fieldErrorMap(r).service_code).toBeDefined();
  });
  it("requires lines on submit", () => {
    const r = validateClaimSubmit({ encounter_type: "op", net_amount: 100, lines: [] });
    expect(fieldErrorMap(r).lines).toBeDefined();
  });
  it("accepts valid line", () => {
    expect(hasBlockingErrors(validateClaimLine({
      service_code: "CPT-99213", service_name: "Visit", qty: 1, unit_price: 100,
    }))).toBe(false);
  });
});

describe("providerValidation — payment", () => {
  it("blocks amount > outstanding", () => {
    const r = validatePayment({ amount: 200, outstanding: 100, method: "cash" });
    expect(fieldErrorMap(r).amount).toContain("exceeds");
  });
  it("requires reference for bank transfer", () => {
    const r = validatePayment({ amount: 50, outstanding: 100, method: "bank_transfer" });
    expect(fieldErrorMap(r).reference).toBeDefined();
  });
  it("accepts cash without reference", () => {
    const r = validatePayment({ amount: 50, outstanding: 100, method: "cash" });
    expect(hasBlockingErrors(r)).toBe(false);
  });
});

describe("providerValidation — denial / appeal", () => {
  it("requires denial code and text", () => {
    const r = validateDenial({});
    expect(fieldErrorMap(r).reason_code).toBeDefined();
    expect(fieldErrorMap(r).reason_text).toBeDefined();
  });
  it("requires appeal note", () => {
    expect(fieldErrorMap(validateAppeal({})).appeal_note).toBeDefined();
    expect(hasBlockingErrors(validateAppeal({ appeal_note: "Reason" }))).toBe(false);
  });
});

describe("providerValidation — authorization", () => {
  it("requires payer + visit_ref", () => {
    const r = validateAuthorizationSubmit({});
    expect(fieldErrorMap(r).payer).toBeDefined();
    expect(fieldErrorMap(r).visit_ref).toBeDefined();
  });
  it("rejects past TAT", () => {
    const r = validateAuthorizationSubmit({
      payer: "BUPA", visit_ref: "V-1", tat_due_at: "2020-01-01T00:00:00Z",
    });
    expect(fieldErrorMap(r).tat_due_at).toBeDefined();
  });
});

describe("providerValidation — discharge advance", () => {
  it("blocks financial without 3 sign-offs", () => {
    const r = validateDischargeAdvance({ target_stage: "financial_discharge" });
    expect(fieldErrorMap(r).nursing_signed_at).toBeDefined();
    expect(fieldErrorMap(r).pharmacy_signed_at).toBeDefined();
    expect(fieldErrorMap(r).physician_signed_at).toBeDefined();
  });
  it("blocks left_facility without financial discharge", () => {
    const r = validateDischargeAdvance({ target_stage: "left_facility" });
    expect(fieldErrorMap(r).financial_discharged_at).toBeDefined();
  });
  it("allows financial when all sign-offs present", () => {
    const r = validateDischargeAdvance({
      target_stage: "financial_discharge",
      nursing_signed_at: "2025-01-01T00:00:00Z",
      pharmacy_signed_at: "2025-01-01T00:00:00Z",
      physician_signed_at: "2025-01-01T00:00:00Z",
    });
    expect(hasBlockingErrors(r)).toBe(false);
  });
});

describe("providerValidation — patient search", () => {
  it("validates Saudi ID 10 digits", () => {
    expect(hasBlockingErrors(validatePatientSearch({ type: "saudi_id", value: "1234567890" }))).toBe(false);
    expect(hasBlockingErrors(validatePatientSearch({ type: "saudi_id", value: "12345" }))).toBe(true);
  });
  it("requires iqama to start with 1 or 2", () => {
    expect(hasBlockingErrors(validatePatientSearch({ type: "iqama", value: "9123456789" }))).toBe(true);
    expect(hasBlockingErrors(validatePatientSearch({ type: "iqama", value: "1123456789" }))).toBe(false);
  });
  it("validates passport 6–9 alnum", () => {
    expect(hasBlockingErrors(validatePatientSearch({ type: "passport", value: "AB12" }))).toBe(true);
    expect(hasBlockingErrors(validatePatientSearch({ type: "passport", value: "AB123456" }))).toBe(false);
  });
});
