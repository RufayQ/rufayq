/**
 * useClaimStatusTimeline — derive a per-claim history of status transitions
 * from the live `usePatientClaims` snapshot + realtime UPDATE events.
 *
 * The DB does not store a transitions table, so this hook synthesises the
 * timeline client-side:
 *   1. The first time a claim is observed, we seed its timeline with an
 *      `initial` entry stamped at `created_at`, and an extra `currentStatus`
 *      entry stamped at `admin_decision_at` (when present) so first paint
 *      already shows the most useful history.
 *   2. Any subsequent change of `status` for that claim — whether from a
 *      realtime UPDATE or a manual reload — appends a new entry to the
 *      timeline using the current wall-clock time.
 *
 * The whole thing is in-memory & frontend-only: no migration required.
 */
import { useEffect, useRef, useState } from "react";
import type { PatientClaim } from "./usePatientClaims";

export interface TimelineEntry {
  status: string;
  /** ISO timestamp string */
  at: string;
  /** True when synthesised from `created_at`/`admin_decision_at` (first paint),
   *  false when captured live as a realtime transition. */
  synthetic: boolean;
}

export type ClaimTimeline = Record<string, TimelineEntry[]>;

/** Sort entries oldest → newest. */
const sortAsc = (entries: TimelineEntry[]) =>
  [...entries].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

export const useClaimStatusTimeline = (claims: PatientClaim[]): ClaimTimeline => {
  const [timeline, setTimeline] = useState<ClaimTimeline>({});
  // Track the last known status per claim so we only append on real changes.
  const lastStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    setTimeline((prev) => {
      const next: ClaimTimeline = { ...prev };
      const lastStatus = lastStatusRef.current;
      let dirty = false;

      for (const c of claims) {
        const existing = next[c.id];
        if (!existing) {
          // First observation — seed the timeline from snapshot fields.
          const seed: TimelineEntry[] = [
            { status: "submitted", at: c.created_at, synthetic: true },
          ];
          if (c.admin_decision_at && c.status !== "submitted") {
            seed.push({ status: c.status, at: c.admin_decision_at, synthetic: true });
          } else if (c.status !== "submitted" && c.status !== "pending_admin") {
            // Status moved past submission but no decision timestamp: stamp now.
            seed.push({ status: c.status, at: new Date().toISOString(), synthetic: true });
          } else if (c.status === "pending_admin") {
            seed.push({ status: "pending_admin", at: c.created_at, synthetic: true });
          }
          next[c.id] = sortAsc(seed);
          lastStatus[c.id] = c.status;
          dirty = true;
        } else if (lastStatus[c.id] !== c.status) {
          // Real transition — append.
          next[c.id] = sortAsc([
            ...existing,
            { status: c.status, at: new Date().toISOString(), synthetic: false },
          ]);
          lastStatus[c.id] = c.status;
          dirty = true;
        }
      }

      return dirty ? next : prev;
    });
  }, [claims]);

  return timeline;
};
