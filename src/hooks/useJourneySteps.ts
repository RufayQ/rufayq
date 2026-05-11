import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listJourneySteps,
  saveJourneyStep,
  removeJourneyStep,
  reorderJourneySteps,
  seedDefaultSteps,
  type JourneyStepRow,
} from "@/lib/api/journeyApi";
import { dbStepToUi, uiStepToDbInput } from "@/lib/journeyMappers";
import { ensurePatient } from "@/lib/api/patientDataApi";
import type { JourneyStep } from "@/constants/data";
import { useGuestMode } from "@/hooks/useGuestMode";
import { journeySteps as defaultJourneySteps } from "@/constants/data";

type UiStep = JourneyStep & { dbId?: string };

export interface UseJourneyStepsResult {
  steps: UiStep[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  addStep: (partial?: Partial<UiStep>) => Promise<UiStep | null>;
  updateStep: (step: UiStep) => Promise<void>;
  removeStep: (step: UiStep) => Promise<void>;
  reorder: (sourceId: number, targetId: number) => Promise<void>;
  setStatus: (step: UiStep, next: JourneyStep["status"]) => Promise<void>;
}

export function useJourneySteps(journeyId: string | null): UseJourneyStepsResult {
  const isGuest = useGuestMode();
  const [rows, setRows] = useState<JourneyStepRow[]>([]);
  const [guestSteps, setGuestSteps] = useState<UiStep[]>(isGuest ? defaultJourneySteps.map((s) => ({ ...s })) : []);
  const [isLoading, setIsLoading] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isGuest || !journeyId) return;
    setIsLoading(true);
    try {
      const pid = patientId ?? (await ensurePatient());
      if (!patientId) setPatientId(pid);
      let data = await listJourneySteps(journeyId);
      if (data.length === 0) {
        try {
          data = await seedDefaultSteps(journeyId, pid);
        } catch (e) {
          console.warn("[useJourneySteps] seed default failed", e);
        }
      }
      setRows(data);
    } catch (e: any) {
      console.warn("[useJourneySteps] refresh failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, journeyId, patientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const steps: UiStep[] = isGuest
    ? guestSteps
    : rows.map(dbStepToUi);

  const addStep = useCallback(
    async (partial?: Partial<UiStep>): Promise<UiStep | null> => {
      if (isGuest) {
        const id = Math.max(0, ...guestSteps.map((s) => s.id)) + 1;
        const ns: UiStep = { id, titleEn: "New Step", titleAr: "خطوة جديدة", date: "TBD", status: "pending", phase: "before", ...partial };
        setGuestSteps((p) => [...p, ns]);
        return ns;
      }
      if (!journeyId) return null;
      const pid = patientId ?? (await ensurePatient());
      if (!patientId) setPatientId(pid);
      const nextOrder = (rows.length > 0 ? Math.max(...rows.map((r) => r.step_order)) : 0) + 1;
      try {
        const row = await saveJourneyStep({
          journey_id: journeyId,
          patient_id: pid,
          step_order: nextOrder,
          step_type: partial?.phase ?? "before",
          title: partial?.titleEn ?? "New Step",
          description: partial?.details ?? null,
          status: "pending",
        });
        setRows((prev) => [...prev, row]);
        return dbStepToUi(row);
      } catch (e: any) {
        toast.error(e?.message ?? "Could not add step");
        return null;
      }
    },
    [isGuest, journeyId, patientId, rows, guestSteps],
  );

  const updateStep = useCallback(
    async (step: UiStep) => {
      if (isGuest) {
        setGuestSteps((p) => p.map((s) => (s.id === step.id ? step : s)));
        return;
      }
      if (!journeyId || !step.dbId) return;
      const pid = patientId ?? (await ensurePatient());
      const prev = rows;
      setRows((p) => p.map((r) => (r.id === step.dbId ? { ...r, title: step.titleEn, description: step.details ?? null, status: step.status, step_type: step.phase } : r)));
      try {
        const row = await saveJourneyStep(uiStepToDbInput(step, journeyId, pid));
        setRows((p) => p.map((r) => (r.id === row.id ? row : r)));
      } catch (e: any) {
        toast.error(e?.message ?? "Could not save step");
        setRows(prev);
      }
    },
    [isGuest, journeyId, patientId, rows],
  );

  const removeStep = useCallback(
    async (step: UiStep) => {
      if (isGuest) {
        setGuestSteps((p) => p.filter((s) => s.id !== step.id));
        return;
      }
      if (!journeyId || !step.dbId) return;
      const pid = patientId ?? (await ensurePatient());
      const prev = rows;
      setRows((p) => p.filter((r) => r.id !== step.dbId));
      try {
        await removeJourneyStep(step.dbId, pid, journeyId);
      } catch (e: any) {
        toast.error(e?.message ?? "Could not delete step");
        setRows(prev);
      }
    },
    [isGuest, journeyId, patientId, rows],
  );

  const reorder = useCallback(
    async (sourceId: number, targetId: number) => {
      if (sourceId === targetId) return;
      const list = steps;
      const src = list.find((s) => s.id === sourceId);
      const tgt = list.find((s) => s.id === targetId);
      if (!src || !tgt || src.phase !== tgt.phase) return;
      const without = list.filter((s) => s.id !== sourceId);
      const tgtIdx = without.findIndex((s) => s.id === targetId);
      const next = [...without.slice(0, tgtIdx), src, ...without.slice(tgtIdx)];

      if (isGuest) {
        setGuestSteps(next);
        return;
      }
      if (!journeyId) return;
      const pid = patientId ?? (await ensurePatient());
      const ordered = next
        .filter((s) => s.dbId)
        .map((s, idx) => ({ id: s.dbId as string, step_order: idx + 1 }));
      const prev = rows;
      // optimistic: re-map rows in new order
      setRows((p) => {
        const byId = new Map(p.map((r) => [r.id, r]));
        return ordered.map((o, idx) => {
          const r = byId.get(o.id);
          return r ? { ...r, step_order: idx + 1 } : r;
        }).filter(Boolean) as JourneyStepRow[];
      });
      try {
        await reorderJourneySteps(journeyId, pid, ordered);
      } catch (e: any) {
        toast.error(e?.message ?? "Reorder failed");
        setRows(prev);
      }
    },
    [isGuest, journeyId, patientId, rows, steps],
  );

  const setStatus = useCallback(
    async (step: UiStep, next: JourneyStep["status"]) => {
      await updateStep({ ...step, status: next });
    },
    [updateStep],
  );

  return { steps, isLoading, refresh, addStep, updateStep, removeStep, reorder, setStatus };
}
