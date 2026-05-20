import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
type TransportRow = {
  id: string;
  label: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  created_at: string;
  user_id: string | null;
  device_id: string;
  deleted_at: string | null;
  key_fields: null;
};

let TRANSPORT_ROWS: TransportRow[] = [];
const lastQuery: { userId?: string; deviceId?: string; orFilter?: string; eqDevice?: string } = {};

vi.mock("@/integrations/supabase/client", () => {
  // Builder simulates the parts of the supabase-js chain that recordSources uses.
  const builder = () => {
    const state: { or?: string; eqDevice?: string } = {};
    const b: Record<string, unknown> = {
      select: () => b,
      is: () => b,
      order: () => b,
      limit: () => b,
      or: (expr: string) => { state.or = expr; lastQuery.orFilter = expr; return b; },
      eq: (col: string, val: string) => {
        if (col === "device_id") { state.eqDevice = val; lastQuery.eqDevice = val; }
        return b;
      },
      then: (resolve: (v: { data: TransportRow[]; error: null }) => unknown) => {
        // Apply minimal ownership filter to mirror what supabase would.
        let rows = TRANSPORT_ROWS.filter((r) => r.deleted_at === null);
        if (state.or) {
          const m = /user_id\.eq\.([^,]+),device_id\.eq\.(.+)/.exec(state.or);
          if (m) {
            const [, uid, did] = m;
            rows = rows.filter((r) => r.user_id === uid || r.device_id === did);
          }
        } else if (state.eqDevice) {
          rows = rows.filter((r) => r.user_id === null && r.device_id === state.eqDevice);
        }
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return b;
  };

  return {
    supabase: {
      from: () => builder(),
      storage: { from: () => ({ createSignedUrl: () => ({ data: null }) }) },
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock("@/lib/supabaseDeviceScope", () => ({
  withDeviceHeader: <T,>(b: T) => b,
  storageWithDeviceHeader: () => ({ createSignedUrl: () => ({ data: null }) }),
}));

let TRAVEL_SCANS: Array<{ id: string; title: string; fileName: string; mimeType: string; createdAt: string; fileUrl?: string }> = [];
let MEDICAL_SCANS: Array<{ id: string; titleEn: string; category: string; fileName: string; mimeType: string; createdAt: string; fileUrl?: string }> = [];
let LOUNGE: Array<{ id: string; program: string; membershipNumber: string; createdAt: string }> = [];

vi.mock("@/lib/travelScannedRecordsStore", () => ({
  listTravelScannedRecords: () => TRAVEL_SCANS,
  subscribeToTravelScannedRecords: () => () => {},
}));
vi.mock("@/lib/scannedRecordsStore", () => ({
  listScannedRecords: () => MEDICAL_SCANS,
  subscribeToScannedRecords: () => () => {},
}));
vi.mock("@/lib/loungeMemberships", () => ({
  listLoungeMemberships: () => LOUNGE,
  subscribeLoungeMemberships: () => () => {},
}));

import { listAllRecordsForUser, domainOf } from "@/lib/records/recordSources";

const ts = (n: number) => new Date(2026, 0, n).toISOString();

beforeEach(() => {
  TRANSPORT_ROWS = [];
  TRAVEL_SCANS = [];
  MEDICAL_SCANS = [];
  LOUNGE = [];
});

describe("listAllRecordsForUser", () => {
  it("merges transport + travel-scan + medical-scan + lounge sources", async () => {
    TRANSPORT_ROWS = [
      { id: "t1", label: "Boarding", file_name: "bp.pdf", file_path: "u/bp.pdf", mime_type: "application/pdf", created_at: ts(5), user_id: "U", device_id: "D", deleted_at: null, key_fields: null },
    ];
    TRAVEL_SCANS = [{ id: "ts1", title: "Visa", fileName: "visa.pdf", mimeType: "application/pdf", createdAt: ts(4), fileUrl: "blob:visa" }];
    MEDICAL_SCANS = [{ id: "ms1", titleEn: "Lab", category: "Lab", fileName: "lab.pdf", mimeType: "application/pdf", createdAt: ts(3), fileUrl: "blob:lab" }];
    LOUNGE = [{ id: "l1", program: "Plaza", membershipNumber: "X", createdAt: ts(2) }];

    const out = await listAllRecordsForUser({ userId: "U", deviceId: "D" });
    expect(out.map((r) => r.origin)).toEqual(["transport", "travel-scan", "medical-scan", "lounge"]);
    expect(out.map((r) => domainOf(r))).toEqual(["travel", "travel", "medical", "travel"]);
  });

  it("excludes soft-deleted transport rows", async () => {
    TRANSPORT_ROWS = [
      { id: "alive", label: "A", file_name: "a.pdf", file_path: "p/a.pdf", mime_type: null, created_at: ts(5), user_id: "U", device_id: "D", deleted_at: null, key_fields: null },
      { id: "dead", label: "B", file_name: "b.pdf", file_path: "p/b.pdf", mime_type: null, created_at: ts(6), user_id: "U", device_id: "D", deleted_at: ts(7), key_fields: null },
    ];
    const out = await listAllRecordsForUser({ userId: "U", deviceId: "D" });
    expect(out.find((r) => r.id === "transport:dead")).toBeUndefined();
    expect(out.find((r) => r.id === "transport:alive")).toBeDefined();
  });

  it("scopes ownership: signed-in sees own user_id OR device_id rows", async () => {
    TRANSPORT_ROWS = [
      { id: "mine-user", label: "x", file_name: "x", file_path: "p/x", mime_type: null, created_at: ts(5), user_id: "U", device_id: "OTHER", deleted_at: null, key_fields: null },
      { id: "mine-dev", label: "x", file_name: "x", file_path: "p/y", mime_type: null, created_at: ts(4), user_id: "OTHER_U", device_id: "D", deleted_at: null, key_fields: null },
      { id: "not-mine", label: "x", file_name: "x", file_path: "p/z", mime_type: null, created_at: ts(3), user_id: "OTHER_U", device_id: "OTHER", deleted_at: null, key_fields: null },
    ];
    const out = await listAllRecordsForUser({ userId: "U", deviceId: "D" });
    const ids = out.map((r) => r.id);
    expect(ids).toContain("transport:mine-user");
    expect(ids).toContain("transport:mine-dev");
    expect(ids).not.toContain("transport:not-mine");
  });

  it("scopes ownership: guest sees only their device rows", async () => {
    TRANSPORT_ROWS = [
      { id: "guest-row", label: "x", file_name: "x", file_path: "p/x", mime_type: null, created_at: ts(5), user_id: null, device_id: "D", deleted_at: null, key_fields: null },
      { id: "other-device", label: "x", file_name: "x", file_path: "p/y", mime_type: null, created_at: ts(4), user_id: null, device_id: "OTHER", deleted_at: null, key_fields: null },
      { id: "owned-by-user", label: "x", file_name: "x", file_path: "p/z", mime_type: null, created_at: ts(3), user_id: "U", device_id: "D", deleted_at: null, key_fields: null },
    ];
    const out = await listAllRecordsForUser({ userId: null, deviceId: "D" });
    const ids = out.map((r) => r.id);
    expect(ids).toContain("transport:guest-row");
    expect(ids).not.toContain("transport:other-device");
    expect(ids).not.toContain("transport:owned-by-user");
  });

  it("sorts newest first with deterministic origin tie-break", async () => {
    // Same timestamp across origins → origin order: transport, travel-scan, medical-scan, lounge.
    TRANSPORT_ROWS = [{ id: "t", label: "x", file_name: "x", file_path: "p/x", mime_type: null, created_at: ts(5), user_id: "U", device_id: "D", deleted_at: null, key_fields: null }];
    TRAVEL_SCANS = [{ id: "ts", title: "x", fileName: "x", mimeType: "application/pdf", createdAt: ts(5), fileUrl: "blob:x" }];
    MEDICAL_SCANS = [{ id: "ms", titleEn: "x", category: "Lab", fileName: "x", mimeType: "application/pdf", createdAt: ts(5), fileUrl: "blob:x" }];
    LOUNGE = [{ id: "l", program: "x", membershipNumber: "x", createdAt: ts(5) }];
    const out = await listAllRecordsForUser({ userId: "U", deviceId: "D" });
    expect(out.map((r) => r.origin)).toEqual(["transport", "travel-scan", "medical-scan", "lounge"]);

    // Newer timestamps come first regardless of origin.
    TRANSPORT_ROWS = [{ id: "t", label: "x", file_name: "x", file_path: "p/x", mime_type: null, created_at: ts(1), user_id: "U", device_id: "D", deleted_at: null, key_fields: null }];
    LOUNGE = [{ id: "l", program: "x", membershipNumber: "x", createdAt: ts(10) }];
    TRAVEL_SCANS = [];
    MEDICAL_SCANS = [];
    const out2 = await listAllRecordsForUser({ userId: "U", deviceId: "D" });
    expect(out2[0].origin).toBe("lounge");
  });

  it("fileBackedOnly excludes lounge rows", async () => {
    TRANSPORT_ROWS = [{ id: "t", label: "x", file_name: "x", file_path: "p/x", mime_type: null, created_at: ts(5), user_id: "U", device_id: "D", deleted_at: null, key_fields: null }];
    LOUNGE = [{ id: "l", program: "x", membershipNumber: "x", createdAt: ts(4) }];
    const all = await listAllRecordsForUser({ userId: "U", deviceId: "D", fileBackedOnly: false });
    const filtered = await listAllRecordsForUser({ userId: "U", deviceId: "D", fileBackedOnly: true });
    expect(all.some((r) => r.origin === "lounge")).toBe(true);
    expect(filtered.some((r) => r.origin === "lounge")).toBe(false);
  });
});
