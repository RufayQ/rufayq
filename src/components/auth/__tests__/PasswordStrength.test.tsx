import { describe, it, expect } from "vitest";
import { evaluatePassword, allRequiredPass } from "../PasswordStrength";

describe("evaluatePassword", () => {
  it("flips each required rule as conditions are met", () => {
    expect(evaluatePassword("").length).toBe(false);
    const c = evaluatePassword("Aa1xxxxx");
    expect(c.length).toBe(true);
    expect(c.upper).toBe(true);
    expect(c.lower).toBe(true);
    expect(c.number).toBe(true);
    expect(c.notCommon).toBe(true);
    expect(c.symbol).toBe(false);
  });

  it("rejects passwords containing the user's first or last name", () => {
    const c = evaluatePassword("Mohammed1A", { firstName: "Mohammed", lastName: "AlSaud" });
    expect(c.notIdentity).toBe(false);
    const c2 = evaluatePassword("alsaud99X", { firstName: "Mohammed", lastName: "AlSaud" });
    expect(c2.notIdentity).toBe(false);
  });

  it("rejects passwords containing 4+ consecutive digits from the phone", () => {
    const c = evaluatePassword("Hello5695!", { phone: "+966569590418" });
    expect(c.notIdentity).toBe(false);
    const ok = evaluatePassword("Hello1234X!", { phone: "+966569590418" });
    expect(ok.notIdentity).toBe(true);
  });

  it("flags common passwords case-insensitively", () => {
    expect(evaluatePassword("Password1").notCommon).toBe(false);
    expect(evaluatePassword("qwerty123A").notCommon).toBe(false);
    expect(evaluatePassword("TestFamily").notCommon).toBe(false);
    expect(evaluatePassword("Tr0ub4dor!").notCommon).toBe(true);
  });

  it("allRequiredPass needs all six required rules", () => {
    expect(allRequiredPass(evaluatePassword("Str0ng!Pass"))).toBe(true);
    expect(allRequiredPass(evaluatePassword("strongpass"))).toBe(false); // no upper, no number
  });
});
