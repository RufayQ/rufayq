/**
 * Local-only scheduled messages. The sender's device persists a queue in
 * localStorage; a singleton ticker delivers due items by inserting them as
 * normal chat messages (so the recipient sees them in realtime exactly like
 * any other message). This keeps the feature WhatsApp-like without needing
 * server-side cron.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export type ScheduledMessage = {
  id: string;
  threadId: string;
  body: string;
  replyToId: string | null;
  scheduledFor: string; // ISO
  createdAt: string; // ISO
};

const KEY = "rufayq.chat.scheduled.v1";

const read = (): ScheduledMessage[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
};
const write = (rows: ScheduledMessage[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* ignore */ }
  listeners.forEach((cb) => cb());
};

const listeners = new Set<() => void>();
export const subscribeScheduled = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

export const listScheduledForThread = (threadId: string): ScheduledMessage[] =>
  read().filter((s) => s.threadId === threadId).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

export const listAllScheduled = (): ScheduledMessage[] =>
  read().sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

export const addScheduled = (m: Omit<ScheduledMessage, "id" | "createdAt">) => {
  const row: ScheduledMessage = {
    ...m,
    id: `sch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  write([...read(), row]);
  return row;
};

export const cancelScheduled = (id: string) => {
  write(read().filter((r) => r.id !== id));
};

export const updateScheduled = (id: string, patch: Partial<Pick<ScheduledMessage, "body" | "scheduledFor">>) => {
  write(read().map((r) => (r.id === id ? { ...r, ...patch } : r)));
};

let tickerStarted = false;
export const startScheduledTicker = () => {
  if (tickerStarted) return;
  tickerStarted = true;
  const tick = async () => {
    const due = read().filter((r) => new Date(r.scheduledFor).getTime() <= Date.now());
    if (due.length === 0) return;
    const remaining = read().filter((r) => !due.some((d) => d.id === r.id));
    write(remaining);
    const deviceId = getDeviceId();
    for (const d of due) {
      try {
        await supabase.from("chat_messages").insert({
          thread_id: d.threadId,
          sender_kind: "patient",
          sender_device_id: deviceId,
          body: d.body,
          reply_to_id: d.replyToId,
        });
      } catch {
        // Re-queue 60s later on failure
        write([...read(), { ...d, scheduledFor: new Date(Date.now() + 60_000).toISOString() }]);
      }
    }
  };
  setInterval(tick, 15_000);
  // Run once on startup
  setTimeout(tick, 1_000);
};
