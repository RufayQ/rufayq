import { describe, it, expect } from "vitest";
import { REALTIME_CHANNELS, listRealtimeChannels } from "@/api/realtime/channels";

describe("realtime channel registry", () => {
  it("has unique channel names", () => {
    const names = listRealtimeChannels().map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every channel has table + event + filter", () => {
    for (const def of listRealtimeChannels()) {
      expect(def.table).toBeTruthy();
      expect(def.event).toBeTruthy();
      expect(def.filter).toBeTruthy();
    }
  });

  it("exposes payments:pending channel", () => {
    expect(REALTIME_CHANNELS.paymentsPending.name).toBe("payments:pending");
    expect(REALTIME_CHANNELS.paymentsPending.table).toBe("payment_receipts");
  });
});
