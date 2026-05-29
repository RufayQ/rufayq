/**
 * useExpandedMilestone — remembers the expanded/collapsed state of an
 * individual MilestoneSheet across navigations and reloads.
 *
 * Storage key: `rufayq:milestone-expanded:<milestoneId>` → "1" | "0".
 * Falls back to `defaultValue` when no preference is stored.
 */
import { useCallback, useEffect, useState } from "react";

const KEY = (id: string) => `rufayq:milestone-expanded:${id}`;

const readStored = (id: string | null | undefined): boolean | null => {
  if (!id || typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY(id));
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
};

export const useExpandedMilestone = (
  milestoneId: string | null | undefined,
  defaultValue = false,
): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] => {
  const [expanded, setExpandedState] = useState<boolean>(() => {
    const stored = readStored(milestoneId);
    return stored ?? defaultValue;
  });

  // Re-sync when the milestone id changes (e.g. user navigates the helicopter).
  useEffect(() => {
    const stored = readStored(milestoneId);
    setExpandedState(stored ?? defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestoneId]);

  const setExpanded = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setExpandedState((prev) => {
        const resolved = typeof next === "function" ? (next as (p: boolean) => boolean)(prev) : next;
        if (milestoneId && typeof window !== "undefined") {
          try {
            window.localStorage.setItem(KEY(milestoneId), resolved ? "1" : "0");
          } catch {
            /* ignore quota errors */
          }
        }
        return resolved;
      });
    },
    [milestoneId],
  );

  return [expanded, setExpanded];
};

export default useExpandedMilestone;
