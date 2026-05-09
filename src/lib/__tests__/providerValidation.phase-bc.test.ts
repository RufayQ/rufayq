import { describe, it, expect } from "vitest";
import {
  validatePatientLink, validateInstruction, validateClaimLine, validateClaimSubmit,
  validatePayment, validateAppeal, validatePatientSearch, validateDischargeAdvance,
  fieldErrorMap, hasBlockingErrors,
} from "@/lib/providerValidation";

describe("providerValidation — Phase B/C surface", () => {
  it("blocks payment exceeding outstanding", () => {
    const issues = validatePayment({ amount: 200, outstanding: 100, method: "cash" });
    expect(hasBlockingErrors(issues)).toBe(true);
    expect(fieldErrorMap(issues).amount).toMatch(/exceeds outstanding/);
  });

  it("requires reference for bank_transfer", () => {
    const issues = validatePayment({ amount: 100, outstanding: 200, method: "bank_transfer" });
    expect(fieldErrorMap(issues).reference).toBeTruthy();
  });

  it("blocks claim submit without lines", () => {
    const issues = validateClaimSubmit({ encounter_type: "op", net_amount: 100, lines: [] });
    expect(fieldErrorMap(issues).lines).toMatch(/at least one/);
  });

  it("blocks financial discharge before all 3 sign-offs", () => {
    const issues = validateDischargeAdvance({
      target_stage: "financial_discharge",
      nursing_signed_at: new Date().toISOString(),
      pharmacy_signed_at: null,
      physician_signed_at: null,
    });
    const map = fieldErrorMap(issues);
    expect(map.pharmacy_signed_at).toBeTruthy();
    expect(map.physician_signed_at).toBeTruthy();
  });

  it("validates Saudi ID format", () => {
    expect(hasBlockingErrors(validatePatientSearch({ type: "saudi_id", value: "12345" }))).toBe(true);
    expect(hasBlockingErrors(validatePatientSearch({ type: "saudi_id", value: "1234567890" }))).toBe(false);
  });

  it("validates Iqama prefix", () => {
    expect(hasBlockingErrors(validatePatientSearch({ type: "iqama", value: "9123456789" }))).toBe(true);
    expect(hasBlockingErrors(validatePatientSearch({ type: "iqama", value: "1234567890" }))).toBe(false);
  });

  it("requires appeal note 1–1000 chars", () => {
    expect(hasBlockingErrors(validateAppeal({ appeal_note: "" }))).toBe(true);
    expect(hasBlockingErrors(validateAppeal({ appeal_note: "valid" }))).toBe(false);
    expect(hasBlockingErrors(validateAppeal({ appeal_note: "x".repeat(1001) }))).toBe(true);
  });

  it("validates patient link device id pattern", () => {
    expect(hasBlockingErrors(validatePatientLink({ patient_device_id: "short" }))).toBe(true);
    expect(hasBlockingErrors(validatePatientLink({ patient_device_id: "abcd-1234-EFGH" }))).toBe(false);
  });

  it("validates claim line money rules", () => {
    const ok = validateClaimLine({ service_code: "CPT-99213", service_name: "Office visit", qty: 1, unit_price: 100 });
    expect(hasBlockingErrors(ok)).toBe(false);
    const bad = validateClaimLine({ service_code: "??", service_name: "", qty: 0, unit_price: -1 });
    expect(hasBlockingErrors(bad)).toBe(true);
  });

  it("instruction body length rules", () => {
    expect(hasBlockingErrors(validateInstruction({ title: "", body: "x" }))).toBe(true);
    expect(hasBlockingErrors(validateInstruction({ title: "T", body: "x".repeat(2001) }))).toBe(true);
  });
});
