/**
 * Medication reminder scheduling.
 *
 * For authenticated users, every medication row with `reminder_enabled !== false`
 * and one or more `reminder_times` (array of "HH:MM" strings) is registered
 * as a repeating daily local notification.
 *
 * Native (iOS/Android via Capacitor): uses @capacitor/local-notifications with
 * a daily-repeating trigger at each {hour, minute}. Tapping the notification
 * surfaces the medication name + dose, so users get due/missed prompts even
 * when the app is closed.
 *
 * Web: falls back to a single in-process timer that fires the next due time
 * via the browser Notification API (when permission is granted). This is
 * best-effort only — the app must be open. The screen-level `deriveStatus`
 * still flags due/missed states regardless of OS notifications.
 */
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNative } from "./index";
import type { MedicationRow } from "@/lib/api/medicationApi";

/** Numeric id derived from medication id + reminder time. Stable across runs. */
export function reminderId(medId: string, hhmm: string): number {
  let hash = 0;
  const src = `${medId}@${hhmm}`;
  for (let i = 0; i < src.length; i++) {
    hash = (hash * 31 + src.charCodeAt(i)) | 0;
  }
  // LocalNotifications requires a positive 32-bit int.
  return Math.abs(hash) % 2147483647 || 1;
}

interface ParsedReminder {
  hour: number;
  minute: number;
  raw: string;
}

function parseReminderTimes(times: unknown): ParsedReminder[] {
  if (!Array.isArray(times)) return [];
  const out: ParsedReminder[] = [];
  for (const t of times) {
    if (typeof t !== "string") continue;
    const m = t.match(/^(\d{1,2}):(\d{2})/);
    if (!m) continue;
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;
    if (!Number.isFinite(minute) || minute < 0 || minute > 59) continue;
    out.push({ hour, minute, raw: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` });
  }
  return out;
}

/** Last-scheduled ids — used so we can cancel before re-scheduling. */
let lastScheduledIds: number[] = [];

/**
 * Sync OS-level medication reminders to match the given medication rows.
 * Cancels any previously scheduled medication notifications and re-schedules.
 * Returns the list of notification ids that were scheduled.
 */
export async function syncMedicationReminders(meds: MedicationRow[]): Promise<number[]> {
  if (!isNative) {
    // Web best-effort fallback handled by scheduleWebReminders below.
    return scheduleWebReminders(meds);
  }

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return [];
    }

    if (lastScheduledIds.length) {
      await LocalNotifications.cancel({
        notifications: lastScheduledIds.map((id) => ({ id })),
      }).catch(() => {});
    }

    const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];
    for (const m of meds) {
      if (m.deleted_at) continue;
      if (m.reminder_enabled === false) continue;
      const times = parseReminderTimes(m.reminder_times);
      for (const t of times) {
        toSchedule.push({
          id: reminderId(m.id, t.raw),
          title: `Time for ${m.medication_name}`,
          body: m.dose ? `Dose: ${m.dose}` : "Medication reminder · موعد الدواء",
          schedule: { on: { hour: t.hour, minute: t.minute }, allowWhileIdle: true },
          extra: { medicationId: m.id, scheduledFor: t.raw },
        });
      }
    }

    if (!toSchedule.length) {
      lastScheduledIds = [];
      return [];
    }
    await LocalNotifications.schedule({ notifications: toSchedule });
    lastScheduledIds = toSchedule.map((n) => n.id);
    return lastScheduledIds;
  } catch (err) {
    console.warn("[medicationReminders] schedule failed", err);
    return [];
  }
}

// ---- Web fallback --------------------------------------------------------
let webTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleWebReminders(meds: MedicationRow[]): number[] {
  if (typeof window === "undefined") return [];
  if (webTimer) {
    clearTimeout(webTimer);
    webTimer = null;
  }
  const upcoming = nextDueAt(meds);
  if (!upcoming) return [];
  const delay = Math.max(1000, upcoming.at - Date.now());
  webTimer = setTimeout(() => {
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`Time for ${upcoming.med.medication_name}`, {
          body: upcoming.med.dose ? `Dose: ${upcoming.med.dose}` : "Medication reminder",
        });
      }
    } catch {
      /* noop */
    }
    // Re-arm for the next slot.
    scheduleWebReminders(meds);
  }, delay);
  return [upcoming.id];
}

/** Compute the soonest upcoming reminder timestamp across all meds. */
export function nextDueAt(
  meds: MedicationRow[],
  now: Date = new Date(),
): { at: number; med: MedicationRow; id: number } | null {
  let best: { at: number; med: MedicationRow; id: number } | null = null;
  for (const m of meds) {
    if (m.deleted_at) continue;
    if (m.reminder_enabled === false) continue;
    const times = parseReminderTimes(m.reminder_times);
    for (const t of times) {
      const at = new Date(now);
      at.setHours(t.hour, t.minute, 0, 0);
      let ms = at.getTime();
      if (ms <= now.getTime()) ms += 24 * 60 * 60 * 1000; // next day
      if (!best || ms < best.at) {
        best = { at: ms, med: m, id: reminderId(m.id, t.raw) };
      }
    }
  }
  return best;
}

/** Cancel all reminders we scheduled. Safe to call from sign-out flows. */
export async function cancelAllMedicationReminders(): Promise<void> {
  if (webTimer) {
    clearTimeout(webTimer);
    webTimer = null;
  }
  if (!isNative || !lastScheduledIds.length) return;
  try {
    await LocalNotifications.cancel({
      notifications: lastScheduledIds.map((id) => ({ id })),
    });
  } catch {
    /* noop */
  }
  lastScheduledIds = [];
}
