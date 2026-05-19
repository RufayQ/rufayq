import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send, Stethoscope, User, RotateCw, X, Reply, Copy, Minimize2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useChatThread, type ChatMessageRow } from "@/hooks/useChatThread";
import { useThreadReadReceipts } from "@/hooks/useThreadReadReceipts";
import { getDeviceId } from "@/hooks/useDeviceId";
import { setActiveThread } from "@/lib/chat/activeThread";
import { useResolvedContact } from "@/hooks/useResolvedContact";
import MessageTicks from "./MessageTicks";
import EmojiPicker from "./EmojiPicker";
import ChatRecordsPicker, { type PickedRecord } from "@/components/chat/ChatRecordsPicker";


interface Props {
  threadId: string;
  title: string;
  subtitle?: string;
  /** Conversation kind drives the avatar icon and label tone. */
  kind?: "direct" | "provider";
  onBack: () => void;
  /** Open the conversation profile (contact info) screen. */
  onOpenProfile?: () => void;
  /** Collapse to a floating chat-head bubble. */
  onMinimize?: () => void;
}

/**
 * Human chat view (direct patient or care provider). Mirrors the AI chat
 * bubble styling so the inbox feels cohesive across all three conversation
 * kinds. Realtime updates come from useChatThread.
 *
 * Adds reply/quote (long-press a bubble), an opens-profile header, and an
 * optional minimize button that hands the thread off to the floating
 * chat-head bubble.
 */
export default function HumanChatView({
  threadId,
  title,
  subtitle,
  kind = "direct",
  onBack,
  onOpenProfile,
  onMinimize,
}: Props) {
  const { messages, send, retry, markRead } = useChatThread(threadId);
  const { othersLastReadAt } = useThreadReadReceipts(threadId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessageRow | null>(null);
  const [actionFor, setActionFor] = useState<string | null>(null);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const me = getDeviceId();

  const handleAttachRecord = async (rec: PickedRecord) => {
    setShowAttachPicker(false);
    const lines = [
      `📎 ${rec.label} — ${rec.file_name}`,
      `(${rec.sourceLabelEn} · ${rec.sourceLabelAr})`,
    ];
    if (rec.signedUrl) lines.push(rec.signedUrl);
    try {
      await send(lines.join("\n"));
      toast.success("Attachment sent · تم إرسال المرفق", { duration: 1600 });
    } catch {
      toast.error("Couldn't send attachment · تعذر إرسال المرفق");
    }
  };


  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  useEffect(() => { markRead(); }, [messages.length, markRead]);
  // Tell the inbox hooks which thread is on-screen so incoming messages for
  // it don't temporarily bump the unread badge between arrival and markRead.
  useEffect(() => {
    setActiveThread(threadId);
    return () => { setActiveThread(null); };
  }, [threadId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await send(input, { replyToId: replyTo?.id ?? null });
      setInput("");
      setReplyTo(null);
    } catch {
      toast.error("Couldn't send message · لم تُرسل الرسالة");
    } finally {
      setSending(false);
    }
  };

  const startLongPress = (m: ChatMessageRow) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setActionFor(m.id);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(15); } catch { /* ignore */ }
      }
    }, 380);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleReply = (m: ChatMessageRow) => {
    setReplyTo(m);
    setActionFor(null);
  };
  const handleCopy = async (m: ChatMessageRow) => {
    try {
      await navigator.clipboard.writeText(m.body);
      toast.success("Copied · تم النسخ");
    } catch {
      toast.error("Copy failed · فشل النسخ");
    }
    setActionFor(null);
  };

  const scrollToMessage = (id: string) => {
    const el = messageRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-[var(--gold)]");
    setTimeout(() => el.classList.remove("ring-2", "ring-[var(--gold)]"), 1400);
  };

  const contact = useResolvedContact(threadId, kind);
  const displayName = kind === "direct" ? (contact?.name ?? title) : title;
  const avatarUrl = kind === "direct" ? (contact?.avatarUrl ?? null) : null;
  const initials = (contact?.initials ?? (displayName || "?").trim().slice(0, 1).toUpperCase()) || "?";
  const roleLabel = kind === "provider" ? "Care provider · مزود الرعاية" : "Direct message · رسالة مباشرة";

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden", background: "var(--off-white)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-3 shrink-0" style={{ background: "linear-gradient(160deg, var(--header-dark-from), var(--header-teal-from))" }}>
        <button onClick={onBack} className="p-1 rounded-full btn-press" aria-label="Back">
          <ChevronLeft size={22} color="#fff" />
        </button>
        <button
          onClick={onOpenProfile}
          className="flex-1 flex items-center gap-3 min-w-0 btn-press text-left"
          aria-label="View contact info"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
            style={{
              background: avatarUrl ? "transparent" : kind === "provider" ? "var(--teal-deep)" : "rgba(255,255,255,0.18)",
              color: "#fff",
              border: "1.5px solid rgba(255,255,255,0.25)",
              fontFamily: "'DM Sans'",
              fontWeight: 700,
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : kind === "provider" ? (
              <Stethoscope size={18} />
            ) : (
              initials || <User size={18} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[15px] font-bold truncate" style={{ fontFamily: "'DM Sans'" }}>{displayName}</p>
            <p className="text-[10.5px] truncate font-mono tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>{roleLabel}</p>
            {subtitle && subtitle !== roleLabel && (
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{subtitle}</p>
            )}
          </div>
        </button>
        {onMinimize && (
          <button
            onClick={onMinimize}
            className="p-2 rounded-full btn-press"
            aria-label="Minimize to bubble"
            title="Minimize to bubble"
          >
            <Minimize2 size={16} color="#fff" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3 space-y-2"
        style={{ WebkitOverflowScrolling: "touch" }}
        onClick={() => actionFor && setActionFor(null)}
      >
        {messages.length === 0 && (
          <p className="text-center text-[12px] mt-8" style={{ color: "var(--gray)" }}>
            Say hi 👋 · ابدأ المحادثة
          </p>
        )}
        {messages.map((m: ChatMessageRow) => {
          const mine = m.sender_device_id === me;
          const time = new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
          const seen = mine && !!othersLastReadAt && othersLastReadAt >= m.created_at && m.status !== "sending" && m.status !== "failed";
          const isAction = actionFor === m.id;
          const quoteMine = m.reply_to ? m.reply_to.sender_device_id === me : false;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-in-up`}>
              <div className="max-w-[78%] relative">
                {isAction && (
                  <div
                    className={`absolute -top-9 ${mine ? "right-0" : "left-0"} flex items-center gap-1 rounded-full px-1.5 py-1 z-10`}
                    style={{ background: "var(--navy)", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReply(m); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] btn-press"
                      style={{ color: "#fff" }}
                    >
                      <Reply size={12} /> Reply
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(m); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] btn-press"
                      style={{ color: "#fff" }}
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                )}
                <div
                  ref={(el) => { messageRefs.current[m.id] = el; }}
                  className="px-3.5 py-2.5 text-[13px] leading-relaxed transition-all"
                  dir="auto"
                  style={{
                    background: mine ? "var(--teal-deep)" : "var(--white)",
                    color: mine ? "#fff" : "var(--ink)",
                    borderRadius: mine ? "14px 3px 14px 14px" : "3px 14px 14px 14px",
                    boxShadow: mine ? "0 3px 12px rgba(0,77,91,0.20)" : "0 2px 8px rgba(0,0,0,0.05)",
                    whiteSpace: "pre-wrap",
                    opacity: m.status === "sending" ? 0.85 : 1,
                  }}
                  onContextMenu={(e) => { e.preventDefault(); setActionFor(m.id); }}
                  onTouchStart={() => startLongPress(m)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onMouseDown={() => startLongPress(m)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                >
                  {m.reply_to && (
                    <button
                      onClick={(e) => { e.stopPropagation(); m.reply_to && scrollToMessage(m.reply_to.id); }}
                      className="block w-full text-left rounded-lg px-2 py-1.5 mb-1.5"
                      style={{
                        background: mine ? "rgba(255,255,255,0.14)" : "rgba(0,77,91,0.06)",
                        borderLeft: `3px solid ${mine ? "var(--gold)" : "var(--teal-deep)"}`,
                      }}
                    >
                      <p
                        className="text-[10px] font-bold mb-0.5"
                        style={{ color: mine ? "var(--gold)" : "var(--teal-deep)" }}
                      >
                        {quoteMine ? "You · أنت" : title}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: mine ? "rgba(255,255,255,0.85)" : "var(--gray)" }}
                      >
                        {m.reply_to.body.slice(0, 80)}
                      </p>
                    </button>
                  )}
                  {m.body}
                  <span className="flex items-center gap-1 font-mono text-[9px] mt-1" style={{ opacity: 0.7, direction: "ltr", justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <span>{time}</span>
                    {mine && <MessageTicks status={m.status} seen={seen} />}
                    {mine && m.status === "failed" && (
                      <button
                        onClick={() => retry(m.id)}
                        className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded"
                        style={{ background: "rgba(255,107,107,0.15)", color: "#ff6b6b" }}
                        aria-label="Retry"
                      >
                        <RotateCw size={9} strokeWidth={2.5} />
                        <span>retry</span>
                      </button>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply pill */}
      {replyTo && (
        <div
          className="shrink-0 mx-2 mb-1 mt-1 rounded-xl px-3 py-2 flex items-start gap-2 animate-fade-in-up"
          style={{ background: "var(--white)", borderLeft: "3px solid var(--gold)", border: "1px solid var(--gray-light)" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold" style={{ color: "var(--gold)" }}>
              Replying to {replyTo.sender_device_id === me ? "yourself · نفسك" : `${title}`}
            </p>
            <p className="text-[11px] truncate mt-0.5" dir="auto" style={{ color: "var(--gray)" }}>
              {replyTo.body.slice(0, 100)}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 rounded-full btn-press shrink-0"
            aria-label="Cancel reply"
          >
            <X size={14} style={{ color: "var(--gray)" }} />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="shrink-0 px-2 py-2.5 flex items-end gap-1.5" style={{ background: "var(--white)", borderTop: "1px solid var(--gray-light)" }}>
        <EmojiPicker onSelect={(e) => setInput((cur) => cur + e)} />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          rows={1}
          placeholder={replyTo ? "Reply… · رد…" : "Type a message · اكتب رسالة"}
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
