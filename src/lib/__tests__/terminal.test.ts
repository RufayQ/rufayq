import { describe, it, expect } from "vitest";
import { normalizeTerminal, isValidTerminal } from "@/lib/terminal";

describe("normalizeTerminal", () => {
  it.each([
    ["Terminal 1", "T1"],
    ["terminal-2", "T2"],
    ["TERM 3", "T3"],
    ["t1", "T1"],
    ["T2", "T2"],
    ["1", "T1"],
    ["2B", "T2B"],
    ["A", "TA"],
    ["TBIT", "TBIT"],
    ["  Terminal  2 B ", "T2B"],
    ["", ""],
    [null, ""],
    [undefined, ""],
  ])("%s → %s", (input, expected) => {
    expect(normalizeTerminal(input as any)).toBe(expected);
  });

  it("isValidTerminal", () => {
    expect(isValidTerminal("T1")).toBe(true);
    expect(isValidTerminal("")).toBe(false);
    expect(isValidTerminal("Terminal 1")).toBe(true);
  });
});
