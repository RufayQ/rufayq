/**
 * Module-level "which thread is the user actively reading" + optimistic
 * read-receipt bus. Used by the inbox hooks so the unread badge never
 * temporarily bumps for messages that land in the thread already on screen.
 *
 * Flow:
 *  - <HumanChatView/> calls setActiveThread(threadId) on mount, null on unmount.
 *  - useChatThread.markRead() calls markThreadReadOptimistic(threadId)
 *    BEFORE issuing the DB update — listeners zero the badge instantly.
 *  - The shared realtime listener in useChatInbox checks getActiveThread()
 *    when a new chat_messages row arrives; if it targets the active thread,
 *    it suppresses the reload and emits an optimistic-read event itself.
 */

let activeThreadId: string | null = null;

export function setActiveThread(id: string | null) {
  activeThreadId = id;
}

export function getActiveThread(): string | null {
  return activeThreadId;
}

export const THREAD_READ_EVENT = "rufayq:thread-read-optimistic";

export function markThreadReadOptimistic(threadId: string) {
  window.dispatchEvent(
    new CustomEvent(THREAD_READ_EVENT, { detail: { threadId } }),
  );
}

export function onThreadReadOptimistic(cb: (threadId: string) => void) {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as { threadId?: string } | undefined;
    if (detail?.threadId) cb(detail.threadId);
  };
  window.addEventListener(THREAD_READ_EVENT, handler);
  return () => window.removeEventListener(THREAD_READ_EVENT, handler);
}
