import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAdminBadges } from "./useAdminBadges";

// In-memory counts that the mock client returns per table.
const counts: Record<string, number> = {
  support_tickets: 4,
  payment_receipts: 2,
  provider_applications: 1,
  patient_claims: 7,
};

vi.mock("@/integrations/supabase/client", () => {
  const make = (table: string) => {
    const builder: any = {
      _table: table,
      select: () => builder,
      in: () => builder,
      eq: () => builder,
      then: (resolve: any) => resolve({ count: counts[table] ?? 0 }),
    };
    return builder;
  };
  return { supabase: { from: (t: string) => make(t) } };
});

describe("useAdminBadges", () => {
  beforeEach(() => { vi.useRealTimers(); });

  it("returns zeros while disabled", () => {
    const { result } = renderHook(() => useAdminBadges(false));
    expect(result.current).toEqual({
      open_tickets: 0, pending_receipts: 0, pending_apps: 0, pending_claims: 0,
    });
  });

  it("loads counts from the four expected tables when enabled", async () => {
    const { result } = renderHook(() => useAdminBadges(true));
    await waitFor(() => {
      expect(result.current.open_tickets).toBe(4);
    });
    expect(result.current).toEqual({
      open_tickets: 4,
      pending_receipts: 2,
      pending_apps: 1,
      pending_claims: 7,
    });
  });

  it("survives a thrown query without crashing (returns 0 for that bucket)", async () => {
    const orig = counts.support_tickets;
    counts.support_tickets = 99;
    const { result } = renderHook(() => useAdminBadges(true));
    await waitFor(() => expect(result.current.open_tickets).toBe(99));
    counts.support_tickets = orig;
  });
});
