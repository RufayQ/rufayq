import { describe, it, expect } from "vitest";
import {
  SubscriptionSchema,
  SubscriptionSummarySchema,
  SubscriptionStatusSchema,
} from "@/api/contracts/subscriptions";

describe("subscription contract", () => {
  it("accepts a complete row", () => {
    const row = {
      id: "11111111-1111-1111-1111-111111111111",
      device_id: "dev-1",
      plan: "STARTER",
      status: "active",
      billing_cycle: "monthly",
      amount: 49,
      currency: "SAR",
      current_period_start: "2026-01-01",
      current_period_end: "2026-02-01",
      activated_at: "2026-01-01",
      notes: null,
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(SubscriptionSchema.safeParse(row).success).toBe(true);
  });

  it("accepts legacy lowercase plan codes", () => {
    expect(SubscriptionSummarySchema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      plan: "basic",
      status: "active",
      billing_cycle: "monthly",
      current_period_end: null,
      amount: null,
      currency: "USD",
    }).success).toBe(true);
  });

  it("rejects unknown status values", () => {
    expect(SubscriptionStatusSchema.safeParse("foo").success).toBe(false);
  });

  it("rejects empty plan code", () => {
    const result = SubscriptionSummarySchema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      plan: "",
      status: "active",
      billing_cycle: "monthly",
      current_period_end: null,
      amount: null,
      currency: "USD",
    });
    expect(result.success).toBe(false);
  });
});
