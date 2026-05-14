import { describe, it, expect } from "vitest";
import { phoneToE164, phoneToEmail, isValidE164 } from "../phoneEmail";

describe("phoneEmail helpers", () => {
  it("normalises bare Saudi numbers to +966", () => {
    expect(phoneToE164("0501234567")).toBe("+966501234567");
    expect(phoneToE164("501234567")).toBe("+966501234567");
  });
  it("preserves explicit + prefix", () => {
    expect(phoneToE164("+201234567890")).toBe("+201234567890");
  });
  it("returns empty for empty input", () => {
    expect(phoneToE164("")).toBe("");
  });
  it("builds the synthetic email used by verify-otp", () => {
    expect(phoneToEmail("+966501234567")).toBe("966501234567@phone.rufayq.local");
  });
  it("validates E.164", () => {
    expect(isValidE164("+966501234567")).toBe(true);
    expect(isValidE164("0501234567")).toBe(false);
  });
});
