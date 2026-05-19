/**
 * Chat attachment handoff — small typed wrapper around sessionStorage used
 * when another screen ("Send to chat" from a Records row) needs to pre-fill
 * the chat upload sheet without forcing the user to re-pick the record.
 *
 * Entries auto-expire after 5 minutes to avoid stale state on next visit.
 */
import type { PickedRecord } from "@/components/chat/ChatRecordsPicker";

const KEY = "rufayq:chat:pendingAttachment";
const TTL_MS = 5 * 60 * 1000;

interface Envelope {
  ts: number;
  payload: PickedRecord;
}

export const stashChatAttachment = (payload: PickedRecord) => {
  try {
    const env: Envelope = { ts: Date.now(), payload };
    sessionStorage.setItem(KEY, JSON.stringify(env));
  } catch (e) {
    console.warn("[chatAttachmentHandoff] stash failed", e);
  }
};

export const consumeChatAttachment = (): PickedRecord | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const env = JSON.parse(raw) as Envelope;
    if (!env || typeof env.ts !== "number") return null;
    if (Date.now() - env.ts > TTL_MS) return null;
    return env.payload ?? null;
  } catch {
    return null;
  }
};
