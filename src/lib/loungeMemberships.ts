/**
 * Local-only storage for lounge access memberships (Dragonpass, Priority Pass,
 * Visa Airport Companion, Mastercard Travel Pass, etc.). The QR encodes the
 * raw membership number — that's what lounge officers scan.
 *
 * Data lives in localStorage; no backend yet. Each membership can optionally
 * be linked to a flight ticket segment id for quick recall at the airport.
 */
const KEY = "rufayq_lounge_memberships_v1";

export interface LoungeMembership {
  id: string;
  program: string;          // e.g. "Dragonpass", "Priority Pass"
  membershipNumber: string; // QR payload
  cardholderName: string;
  cardLast4?: string;       // optional linked credit card last 4
  expiresOn?: string;       // YYYY-MM-DD
  linkedSegmentId?: string; // optional flight segment association
  notes?: string;
  createdAt: string;
}

const safeRead = (): LoungeMembership[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LoungeMembership[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = (rows: LoungeMembership[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* noop */ }
  listeners.forEach((fn) => fn());
};

const listeners = new Set<() => void>();

export const subscribeLoungeMemberships = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

export const listLoungeMemberships = (): LoungeMembership[] => safeRead();

export const saveLoungeMembership = (input: Omit<LoungeMembership, "id" | "createdAt"> & { id?: string }) => {
  const rows = safeRead();
  if (input.id) {
    const next = rows.map((r) => (r.id === input.id ? { ...r, ...input, id: r.id, createdAt: r.createdAt } as LoungeMembership : r));
    safeWrite(next);
    return next.find((r) => r.id === input.id)!;
  }
  const row: LoungeMembership = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  safeWrite([row, ...rows]);
  return row;
};

export const deleteLoungeMembership = (id: string) => {
  safeWrite(safeRead().filter((r) => r.id !== id));
};
