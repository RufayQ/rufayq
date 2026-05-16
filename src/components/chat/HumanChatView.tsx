import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Stethoscope, User } from "lucide-react";
import { useChatThread, type ChatMessageRow } from "@/hooks/useChatThread";
import { getDeviceId } from "@/hooks/useDeviceId";

interface Props {
  threadId: string;
  title: string;
  subtitle?: string;
  /** Conversation kind drives the avatar icon and label tone. */
  kind?: "direct" | "provider";
  onBack: () => void;
}

/**
 * Human chat view (direct patient or care provider). Mirrors the AI chat
 * bubble styling so the inbox feels cohesive across all three conversation
 * kinds. Realtime updates come from useChatThread.
 */
export default function HumanChatView({ threadId, title, subtitle, kind = "direct", onBack }: Props) {
  const { messages, send, markRead } = useChatThread(threadId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const me = getDeviceId();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  useEffect(() => { markRead(); }, [messages.length, markRead]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try { await send(input); setInput(""); }
    finally { setSending(false); }
  };

  const initials = (title || "?").trim().slice(0, 1).toUpperCase();
  const roleLabel = kind === "provider" ? "Care provider · مزود الرعاية" : "Direct message · رسالة مباشرة";

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden", background: "var(--off-white)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-3 shrink-0" style={{ background: "linear-gradient(160deg, var(--header-dark-from), var(--header-teal-from))" }}>
        <button onClick={onBack} className="p-1 rounded-full btn-press" aria-label="Back">
          <ChevronLeft size={22} color="#fff" />
        </button>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: kind === "provider" ? "var(--teal-deep)" : "rgba(255,255,255,0.18)",
            color: "#fff",
            border: "1.5px solid rgba(255,255,255,0.25)",
            fontFamily: "'DM Sans'",
            fontWeight: 700,
          }}
        >
          {kind === "provider" ? <Stethoscope size={18} /> : (initials || <User size={18} />)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[15px] font-bold truncate" style={{ fontFamily: "'DM Sans'" }}>{title}</p>
          <p className="text-[10.5px] truncate font-mono tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>{roleLabel}</p>
          {subtitle && subtitle !== roleLabel && (
            <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3 space-y-2" style={{ WebkitOverflowScrolling: "touch" }}>
        {messages.length === 0 && (
          <p className="text-center text-[12px] mt-8" style={{ color: "var(--gray)" }}>
            Say hi 👋 · ابدأ المحادثة
          </p>
        )}
        {messages.map((m: ChatMessageRow) => {
          const mine = m.sender_device_id === me;
          const time = new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-in-up`}>
              <div
                className="max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed"
                dir="auto"
                style={{
                  background: mine ? "var(--teal-deep)" : "var(--white)",
                  color: mine ? "#fff" : "var(--ink)",
                  borderRadius: mine ? "14px 3px 14px 14px" : "3px 14px 14px 14px",
                  boxShadow: mine ? "0 3px 12px rgba(0,77,91,0.20)" : "0 2px 8px rgba(0,0,0,0.05)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.body}
                <span className="block font-mono text-[9px] mt-1" style={{ opacity: 0.55, direction: "ltr", textAlign: mine ? "right" : "left" }}>{time}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 px-3 py-2.5 flex items-end gap-2" style={{ background: "var(--white)", borderTop: "1px solid var(--gray-light)" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          rows={1}
          placeholder="Type a message · اكتب رسالة"
          dir="auto"
          className="flex-1 resize-none rounded-2xl px-3.5 py-2.5 text-[13px] outline-none"
          style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", maxHeight: 120 }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center btn-press shrink-0"
          style={{ background: "var(--teal-deep)", opacity: input.trim() && !sending ? 1 : 0.4 }}
          aria-label="Send"
        >
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}
