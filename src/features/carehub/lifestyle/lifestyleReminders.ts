/**
 * Lifestyle reminders — a separate channel from medication reminders so users
 * can mute lifestyle nudges without losing medical ones. v1 schedules a single
 * `setTimeout` per plan inside the current tab; on page reload we re-arm from
 * the stored plan list. No Web Notifications API yet — toasts only.
 */

import { toast } from "sonner";
import type { LifestylePlan } from "./lifestyleStore";

const timers = new Map<string, number>();
const KEY_MUTED = "rufayq_lifestyle_reminders_muted";

export const isMuted = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY_MUTED) === "1";
};

export const setMuted = (muted: boolean) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_MUTED, muted ? "1" : "0");
};

const nextOccurrence = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t.getTime() - now.getTime();
};

export const armReminder = (plan: LifestylePlan) => {
  if (!plan.reminderTime || isMuted()) return;
  const existing = timers.get(plan.id);
  if (existing) window.clearTimeout(existing);
  const ms = nextOccurrence(plan.reminderTime);
  const id = window.setTimeout(() => {
    toast(`${plan.title} · ${plan.titleAr ?? ""}`, {
      description: "Time for your lifestyle session · حان وقت الجلسة",
      duration: 6000,
    });
    armReminder(plan); // re-arm for next day
  }, ms);
  timers.set(plan.id, id);
};

export const clearReminder = (planId: string) => {
  const existing = timers.get(planId);
  if (existing) {
    window.clearTimeout(existing);
    timers.delete(planId);
  }
};

export const armAll = (plans: LifestylePlan[]) => {
  plans.forEach(armReminder);
};
