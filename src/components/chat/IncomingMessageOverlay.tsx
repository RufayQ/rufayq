import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";

export interface IncomingChatDetail {
  threadId: string;
  sender: string;
  body: string;
  messageId: string;
}

interface Props {
  /** When the user taps "Open", switch to chat & pass the threadId here. */
  onOpenThread?: (threadId: string) => void;
}

/**
 * WhatsApp-style heads-up overlay for incoming chat messages while the user
 * is on any screen OR has the chat popup active in another thread.
 * Listens to the global `rufayq:incoming-chat` CustomEvent emitted by
 * `useGlobalChat`. Supports inline quick-reply without leaving the screen.
 */
export default function IncomingMessageOverlay({ onOpenThread }: Props) {
  const [current, setCurrent] = useState<IncomingChatDetail | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<IncomingChatDetail>;
      if (!ce.detail) return;
      setCurrent(ce.detail);
      setReply("");
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setCurrent(null), 6500);
    };
    window.addEventListener("rufayq:incoming-chat", handler);
    return () => {
      window.removeEventListener("rufayq:incoming-chat", handler);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  if (!current) return null;

  const close = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setCurrent(null);
  };

  const handleQuickReply = async () => {
    const body = reply.trim();
    if (!body || !current || sending) return;
    setSending(true);
    try {
      await supabase.from("chat_messages").insert({
        thread_id: current.threadId,
        sender_kind: "patient",
        sender_device_id: getDeviceId(),
        body,
      });
      await supabase
        .from("chat_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("thread_id", current.threadId)
        .eq("device_id", getDeviceId());
      close();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed top-2 inset-x-2 z-[200] pointer-events-none">
      <div
        className="pointer-events-auto mx-auto max-w-[380px] rounded-2xl overflow-hidden animate-fade-in-up"
        style={{
          background: "rgba(20, 25, 35, 0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color: "#fff",
          boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-start gap-3 px-3.5 pt-3 pb-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--teal-deep)" }}
          >
            <MessageCircle size={16} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold truncate">{current.sender}</p>
            <p className="text-[12px] opacity-85 line-clamp-2" dir="auto">{current.body}</p>
          </div>
          <button onClick={close} aria-label="Dismiss" className="opacity-70 hover:opacity-100 p-0.5">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 pb-2.5">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleQuickReply(); } }}
            placeholder="Quick reply · رد سريع"
            dir="auto"
            className="flex-1 rounded-full px-3 py-1.5 text-[12px] outline-none"
            style={{ background: "rgba(255,255,255,0.10)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
          />
          <button
            onClick={handleQuickReply}
            disabled={!reply.trim() || sending}
            className="w-8 h-8 rounded-full flex items-center justify-center btn-press shrink-0"
            style={{ background: "var(--teal-deep)", opacity: reply.trim() && !sending ? 1 : 0.45 }}
            aria-label="Send quick reply"
          >
            <Send size={13} color="#fff" />
          </button>
          <button
            onClick={() => { onOpenThread?.(current.threadId); close(); }}
            className="text-[11px] px-3 py-1.5 rounded-full font-semibold shrink-0"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
}
