import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all underlying stores BEFORE importing the hook so the canonical
// reader picks up our fixtures. We only care that the count parity contract
// holds — total === sum(byDomain).
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: vi.fn(),
    from: () => ({
      select: () => ({
        is: () => ({
          order: () => ({
            limit: () => ({
              or: () => Promise.resolve({ data: [], error: null }),
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/supabaseDeviceScope", () => ({
  withDeviceHeader: (q: unknown) => q as Promise<{ data: unknown[]; error: null }>,
  storageWithDeviceHeader: () => ({ createSignedUrl: () => ({ data: null }) }),
}));

vi.mock("@/lib/travelScannedRecordsStore", () => ({
  listTravelScannedRecords: () => [
    { id: "t1", title: "Visa", fileName: "v.pdf", mimeType: "application/pdf", createdAt: new Date().toISOString(), fileUrl: "blob:visa" },
    { id: "t2", title: "Passport", fileName: "p.pdf", mimeType: "application/pdf", createdAt: new Date().toISOString(), fileUrl: "blob:passport" },
  ],
  subscribeToTravelScannedRecords: () => () => {},
}));

vi.mock("@/lib/scannedRecordsStore", () => ({
  listScannedRecords: () => [
    { id: "m1", titleEn: "Lab", category: "Lab", fileName: "l.pdf", mimeType: "application/pdf", createdAt: new Date().toISOString(), fileUrl: "blob:lab" },
  ],
  subscribeToScannedRecords: () => () => {},
}));

vi.mock("@/lib/loungeMemberships", () => ({
  listLoungeMemberships: () => [
    { id: "l1", program: "Plaza Premium", membershipNumber: "X", createdAt: new Date().toISOString() },
  ],
  subscribeLoungeMemberships: () => () => {},
}));

vi.mock("@/hooks/useDeviceId", () => ({
  getDeviceId: () => "test-device",
}));

import { renderHook, waitFor } from "@testing-library/react";
import { useUnifiedRecordCount } from "@/hooks/useUnifiedRecordCount";

describe("useUnifiedRecordCount — parity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("total === sum(byDomain) across every mocked origin", async () => {
    const { result } = renderHook(() => useUnifiedRecordCount({ userId: null }));

    await waitFor(() => {
      expect(result.current.total).toBeGreaterThan(0);
    });

    const { total, byDomain } = result.current;
    expect(total).toBe(byDomain.travel + byDomain.medical);
    // 2 travel scans + 1 medical scan + 1 lounge (also travel domain) = 4
    expect(total).toBe(4);
    expect(byDomain.travel).toBe(3);
    expect(byDomain.medical).toBe(1);
  });
});
