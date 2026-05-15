import { describe, it, expect } from "vitest";
import { phoneToE164, phoneToEmail, isValidE164, composeE164, splitE164 } from "../phoneEmail";

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
  it("composes E.164 from country + national, stripping leading zeros", () => {
    expect(composeE164("SA", "0501234567")).toBe("+966501234567");
    expect(composeE164("AE", "501234567")).toBe("+971501234567");
    expect(composeE164("EG", "1001234567")).toBe("+201001234567");
    expect(composeE164("US", "+15551234567")).toBe("+15551234567");
    expect(composeE164("XX", "501234567")).toBe("+966501234567"); // unknown -> SA fallback
    expect(composeE164("SA", "")).toBe("");
  });
  it("splits E.164 back into country + national", () => {
    expect(splitE164("+966501234567")).toEqual({ country: "SA", national: "501234567" });
    expect(splitE164("+201001234567")).toEqual({ country: "EG", national: "1001234567" });
    expect(splitE164("+971501234567")).toEqual({ country: "AE", national: "501234567" });
  });
});
