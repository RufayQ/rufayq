import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Send, Stethoscope, User, RotateCw, X, Reply, Copy, Minimize2, Paperclip, Pencil, Trash2, Clock, CalendarClock, Check } from "lucide-react";
import { toast } from "sonner";
import { useChatThread, type ChatMessageRow } from "@/hooks/useChatThread";
import { useThreadReadReceipts } from "@/hooks/useThreadReadReceipts";
import { getDeviceId } from "@/hooks/useDeviceId";
import { setActiveThread } from "@/lib/chat/activeThread";
import { useResolvedContact } from "@/hooks/useResolvedContact";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { useBackHandler } from "@/hooks/useBackHandler";
import MessageTicks from "./MessageTicks";
import EmojiPicker from "./EmojiPicker";
import ChatRecordsPicker, { type PickedRecord } from "@/components/chat/ChatRecordsPicker";
import ChatPickerErrorBoundary from "@/components/chat/ChatPickerErrorBoundary";
import ChatAttachmentCard from "@/components/chat/ChatAttachmentCard";
import { encodeChatAttachment, parseChatBody } from "@/lib/chat/chatAttachmentBody";
import {
  addScheduled,
  cancelScheduled,
  listScheduledForThread,
  subscribeScheduled,
  type ScheduledMessage,
} from "@/lib/chat/scheduledMessages";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];



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
  /** Optional record handed off from "Send to chat" — pre-pinned to composer awaiting user send. */
  initialPendingAttachment?: PickedRecord | null;
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
  initialPendingAttachment = null,
}: Props) {
  const { messages, send, retry, markRead, editMessage, deleteMessage } = useChatThread(threadId);
  const { othersLastReadAt } = useThreadReadReceipts(threadId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessageRow | null>(null);
  const [actionFor, setActionFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PickedRecord | null>(initialPendingAttachment);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const [showScheduledList, setShowScheduledList] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const me = getDeviceId();

  // Emoji reactions on individual messages
  const messageIds = useMemo(() => messages.map((m) => m.id).filter((id) => !id.startsWith("temp-")), [messages]);
  const { reactions, toggle: toggleReaction, me: meUserId } = useMessageReactions(threadId, messageIds);
  const reactionsByMessage = useMemo(() => {
    const map = new Map<string, { emoji: string; count: number; mine: boolean }[]>();
    for (const r of reactions) {
      const arr = map.get(r.message_id) ?? [];
      const existing = arr.find((x) => x.emoji === r.emoji);
      if (existing) {
        existing.count += 1;
        if (r.user_id === meUserId) existing.mine = true;
      } else {
        arr.push({ emoji: r.emoji, count: 1, mine: r.user_id === meUserId });
      }
      map.set(r.message_id, arr);
    }
    return map;
  }, [reactions, meUserId]);

  // Smart hardware-back: if the action bar is open, close it; otherwise pop
  // back to the inbox (the parent ChatScreen state) instead of jumping to Home.
  const backHandler = useCallback((): boolean => {
    if (actionFor) { setActionFor(null); return true; }
    if (showAttachPicker) { setShowAttachPicker(false); return true; }
    if (showScheduler) { setShowScheduler(false); return true; }
    if (showScheduledList) { setShowScheduledList(false); return true; }
    if (replyTo) { setReplyTo(null); return true; }
    if (editingId) { setEditingId(null); setInput(""); return true; }
    onBack();
    return true;
  }, [actionFor, showAttachPicker, showScheduler, showScheduledList, replyTo, editingId, onBack]);
  useBackHandler(backHandler, true);

  // Track scheduled messages for this thread
  useEffect(() => {
    const refresh = () => setScheduled(listScheduledForThread(threadId));
    refresh();
    return subscribeScheduled(refresh);
  }, [threadId]);


  // Re-pin attachment if parent hands off a new one (e.g. opening a thread
  // from "Send to chat" after the view is already mounted).
  useEffect(() => {
    if (initialPendingAttachment) setPendingAttachment(initialPendingAttachment);
  }, [initialPendingAttachment]);

  const handleAttachRecord = (rec: PickedRecord) => {
    setShowAttachPicker(false);
    setPendingAttachment(rec);
  };

  const renderBodyWithLinks = (body: string, mine: boolean) => {
    const segments = parseChatBody(body);
    return segments.map((seg, i) => {
      if (seg.type === "attachment") {
        return (
          <div key={`att-${i}`} className="my-1.5">
            <ChatAttachmentCard payload={seg.payload} mine={mine} />
          </div>
        );
      }
      const parts = seg.value.split(/(https?:\/\/[^\s]+)/g);
      return (
        <span key={`txt-${i}`}>
          {parts.map((part, j) => {
            if (/^https?:\/\//.test(part)) {
              return (
                <a
                  key={j}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="underline font-medium"
                  style={{ color: mine ? "var(--gold)" : "var(--teal-deep)", wordBreak: "break-all" }}
                >
                  {part}
                </a>
              );
            }
            return <span key={j}>{part}</span>;
          })}
        </span>
      );
    });
  };


  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  useEffect(() => { markRead(); }, [messages.length, markRead]);
  // Tell the inbox hooks which thread is on-screen so incoming messages for
  // it don't temporarily bump the unread badge between arrival and markRead.
  useEffect(() => {
    setActiveThread(threadId);
    return () => { setActiveThread(null); };
  }, [threadId]);

  const buildBody = (text: string): string => {
    if (pendingAttachment) {
      const marker = encodeChatAttachment({
        kind: pendingAttachment.kind,
        label: pendingAttachment.label,
        fileName: pendingAttachment.file_name,
        sourceLabelEn: pendingAttachment.sourceLabelEn,
        sourceLabelAr: pendingAttachment.sourceLabelAr,
        url: pendingAttachment.signedUrl,
        mimeType: pendingAttachment.mime_type ?? null,
      });
      return text ? `${marker}\n${text}` : marker;
    }
    return text;
  };

  const handleSend = async () => {
    if (sending) return;
    const text = input.trim();
    if (!text && !pendingAttachment && !editingId) return;
    setSending(true);
    try {
      if (editingId) {
        await editMessage(editingId, text);
        toast.success("Edited · تم التعديل");
        setEditingId(null);
        setInput("");
        return;
      }
      const body = buildBody(text);
      await send(body, { replyToId: replyTo?.id ?? null });
      setInput("");
      setReplyTo(null);
      setPendingAttachment(null);
    } catch {
      toast.error("Couldn't send message · لم تُرسل الرسالة");
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = (whenIso: string) => {
    const text = input.trim();
    if (!text && !pendingAttachment) {
      toast.error("Type a message to schedule · اكتب رسالة للجدولة");
      return;
    }
    const body = buildBody(text);
    addScheduled({ threadId, body, replyToId: replyTo?.id ?? null, scheduledFor: whenIso });
    setInput("");
    setReplyTo(null);
    setPendingAttachment(null);
    setShowScheduler(false);
    toast.success(`Scheduled for ${new Date(whenIso).toLocaleString()} · مجدولة`);
  };

  const startLongPress = (m: ChatMessageRow) => {
    if (m.deleted_at) return;
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
  const handleStartEdit = (m: ChatMessageRow) => {
    // Strip attachment marker — only the text portion is editable.
    const segs = parseChatBody(m.body);
    const text = segs.filter((s) => s.type === "text").map((s) => (s as { value: string }).value).join("").trim();
    setEditingId(m.id);
    setInput(text);
    setReplyTo(null);
    setActionFor(null);
  };
  const handleDelete = async (m: ChatMessageRow) => {
    setActionFor(null);
    try {
      await deleteMessage(m.id);
      toast.success("Deleted · تم الحذف");
    } catch {
      toast.error("Couldn't delete · تعذّر الحذف");
    }
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
          const isDeleted = !!m.deleted_at;
          const isEdited = !!m.edited_at && !isDeleted;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-in-up`}>
              <div className="max-w-[78%] relative">
                {isAction && !isDeleted && (
                  <div className={`absolute -top-[88px] ${mine ? "right-0" : "left-0"} z-10 flex flex-col items-stretch gap-1.5`}>
                    {/* Quick emoji reaction bar — single tap, no separate emoji message */}
                    <div
                      className="flex items-center gap-0.5 rounded-full px-2 py-1.5"
                      style={{ background: "var(--white)", boxShadow: "0 6px 18px rgba(0,0,0,0.18)", border: "1px solid var(--gray-light)" }}
                    >
                      {QUICK_REACTIONS.map((emo) => (
                        <button
                          key={emo}
                          onClick={(e) => { e.stopPropagation(); void toggleReaction(m.id, emo); setActionFor(null); }}
                          className="px-1.5 py-0.5 text-[18px] leading-none rounded-full hover:scale-125 transition-transform"
                          aria-label={`React ${emo}`}
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                    {/* Action chips */}
                    <div className={`flex items-center gap-1 rounded-full px-1.5 py-1 ${mine ? "self-end" : "self-start"}`}
                      style={{ background: "var(--navy)", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}
                    >
                      <button onClick={(e) => { e.stopPropagation(); handleReply(m); }} className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] btn-press" style={{ color: "#fff" }}>
                        <Reply size={12} /> Reply
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleCopy(m); }} className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] btn-press" style={{ color: "#fff" }}>
                        <Copy size={12} /> Copy
                      </button>
                      {mine && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); handleStartEdit(m); }} className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] btn-press" style={{ color: "#fff" }} aria-label="Edit · تعديل">
                            <Pencil size={12} /> Edit
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(m); }} className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] btn-press" style={{ color: "#ff8a8a" }} aria-label="Delete · حذف">
                            <Trash2 size={12} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div
                  ref={(el) => { messageRefs.current[m.id] = el; }}
                  className="px-3.5 py-2.5 text-[13px] leading-relaxed transition-all"
                  dir="auto"
                  style={{
                    background: isDeleted ? "var(--off-white)" : mine ? "var(--teal-deep)" : "var(--white)",
                    color: isDeleted ? "var(--gray)" : mine ? "#fff" : "var(--ink)",
                    borderRadius: mine ? "14px 3px 14px 14px" : "3px 14px 14px 14px",
                    boxShadow: isDeleted ? "none" : mine ? "0 3px 12px rgba(0,77,91,0.20)" : "0 2px 8px rgba(0,0,0,0.05)",
                    border: isDeleted ? "1px dashed var(--gray-light)" : undefined,
                    fontStyle: isDeleted ? "italic" : undefined,
                    whiteSpace: "pre-wrap",
                    opacity: m.status === "sending" ? 0.85 : 1,
                  }}
                  onContextMenu={(e) => { if (!isDeleted) { e.preventDefault(); setActionFor(m.id); } }}
                  onTouchStart={() => startLongPress(m)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onMouseDown={() => startLongPress(m)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                >
                  {m.reply_to && !isDeleted && (
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
                  {isDeleted ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Trash2 size={11} /> Message deleted · رسالة محذوفة
                    </span>
                  ) : (
                    renderBodyWithLinks(m.body, mine)
                  )}
                  <span className="flex items-center gap-1 font-mono text-[9px] mt-1" style={{ opacity: 0.7, direction: "ltr", justifyContent: mine ? "flex-end" : "flex-start" }}>
                    {isEdited && <span style={{ fontStyle: "italic" }}>edited ·</span>}
                    <span>{time}</span>
                    {mine && !isDeleted && <MessageTicks status={m.status} seen={seen} />}
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
                {/* Reaction chips — grouped by emoji; tap your own to remove */}
                {(() => {
                  const rs = reactionsByMessage.get(m.id);
                  if (!rs || rs.length === 0) return null;
                  return (
                    <div className={`flex flex-wrap gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
                      {rs.map((r) => (
                        <button
                          key={r.emoji}
                          onClick={(e) => { e.stopPropagation(); void toggleReaction(m.id, r.emoji); }}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] btn-press"
                          style={{
                            background: r.mine ? "rgba(197,150,90,0.18)" : "var(--white)",
                            border: `1px solid ${r.mine ? "var(--gold)" : "var(--gray-light)"}`,
                            color: "var(--ink)",
                          }}
                          aria-label={`${r.emoji} ${r.count}${r.mine ? " (you reacted)" : ""}`}
                        >
                          <span>{r.emoji}</span>
                          {r.count > 1 && <span className="font-mono text-[10px]" style={{ color: "var(--gray)" }}>{r.count}</span>}
                        </button>
                      ))}
                    </div>
                  );
                })()}
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

      {/* Pending attachment pill */}
      {pendingAttachment && (
        <div
          className="shrink-0 mx-2 mb-1 mt-1 rounded-xl px-3 py-2 flex items-start gap-2 animate-fade-in-up"
          style={{ background: "var(--white)", borderLeft: "3px solid var(--teal-deep)", border: "1px solid var(--gray-light)" }}
        >
          <Paperclip size={14} style={{ color: "var(--teal-deep)", marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold truncate" style={{ color: "var(--teal-deep)" }}>
              {pendingAttachment.label}
            </p>
            <p className="text-[10.5px] truncate" style={{ color: "var(--gray)" }}>
              {pendingAttachment.file_name}
            </p>
            <p className="text-[9.5px] mt-0.5 font-mono tracking-wide" style={{ color: "var(--gray)" }}>
              {pendingAttachment.sourceLabelEn} · {pendingAttachment.sourceLabelAr}
            </p>
          </div>
          <button
            onClick={() => setPendingAttachment(null)}
            className="p-1 rounded-full btn-press shrink-0"
            aria-label="Remove attachment · إزالة المرفق"
          >
            <X size={14} style={{ color: "var(--gray)" }} />
          </button>
        </div>
      )}

      {/* Editing pill */}
      {editingId && (
        <div
          className="shrink-0 mx-2 mb-1 mt-1 rounded-xl px-3 py-2 flex items-start gap-2 animate-fade-in-up"
          style={{ background: "var(--white)", borderLeft: "3px solid var(--gold)", border: "1px solid var(--gray-light)" }}
        >
          <Pencil size={14} style={{ color: "var(--gold)", marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold" style={{ color: "var(--gold)" }}>
              Editing message · تعديل الرسالة
            </p>
            <p className="text-[10.5px] mt-0.5" style={{ color: "var(--gray)" }}>
              Press Send to save · اضغط إرسال للحفظ
            </p>
          </div>
          <button
            onClick={() => { setEditingId(null); setInput(""); }}
            className="p-1 rounded-full btn-press shrink-0"
            aria-label="Cancel edit · إلغاء التعديل"
          >
            <X size={14} style={{ color: "var(--gray)" }} />
          </button>
        </div>
      )}

      {/* Scheduled queue chip */}
      {scheduled.length > 0 && !editingId && (
        <button
          onClick={() => setShowScheduledList(true)}
          className="shrink-0 mx-2 mb-1 mt-1 rounded-xl px-3 py-2 flex items-center gap-2 btn-press text-left"
          style={{ background: "var(--white)", borderLeft: "3px solid var(--teal-deep)", border: "1px solid var(--gray-light)" }}
        >
          <CalendarClock size={14} style={{ color: "var(--teal-deep)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold" style={{ color: "var(--teal-deep)" }}>
              {scheduled.length} scheduled · رسائل مجدولة
            </p>
            <p className="text-[10.5px] truncate" style={{ color: "var(--gray)" }}>
              Next at {new Date(scheduled[0].scheduledFor).toLocaleString()}
            </p>
          </div>
        </button>
      )}

      {/* Composer */}
      <div className="shrink-0 px-2 py-2.5 flex items-end gap-1.5" style={{ background: "var(--white)", borderTop: "1px solid var(--gray-light)" }}>
        <EmojiPicker onSelect={(e) => setInput((cur) => cur + e)} />
        {!editingId && (
          <button
            onClick={() => setShowAttachPicker(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center btn-press shrink-0"
            style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
            aria-label="Attach from records"
            title="Attach from records · إرفاق من السجلات"
          >
            <Paperclip size={16} style={{ color: "var(--teal-deep)" }} />
          </button>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          rows={1}
          placeholder={editingId ? "Edit message… · تعديل…" : replyTo ? "Reply… · رد…" : "Type a message · اكتب رسالة"}
          dir="auto"
          className="flex-1 resize-none rounded-2xl px-3.5 py-2.5 text-[13px] outline-none"
          style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)", maxHeight: 120 }}
        />
        {!editingId && (
          <button
            onClick={() => setShowScheduler(true)}
            disabled={!input.trim() && !pendingAttachment}
            className="w-10 h-10 rounded-full flex items-center justify-center btn-press shrink-0"
            style={{
              background: "var(--off-white)",
              border: "1px solid var(--gray-light)",
              opacity: (input.trim() || pendingAttachment) ? 1 : 0.4,
            }}
            aria-label="Schedule message · جدولة الرسالة"
            title="Schedule message · جدولة الرسالة"
          >
            <Clock size={16} style={{ color: "var(--teal-deep)" }} />
          </button>
        )}
        <button
          onClick={handleSend}
          disabled={(!input.trim() && !pendingAttachment && !editingId) || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center btn-press shrink-0"
          style={{ background: editingId ? "var(--gold)" : "var(--teal-deep)", opacity: ((input.trim() || pendingAttachment || editingId) && !sending) ? 1 : 0.4 }}
          aria-label={editingId ? "Save edit · حفظ التعديل" : "Send"}
        >
          {editingId ? <Check size={16} color="#fff" /> : <Send size={16} color="#fff" />}
        </button>
      </div>

      <ChatPickerErrorBoundary onReset={() => setShowAttachPicker(false)}>
        <ChatRecordsPicker
          open={showAttachPicker}
          onClose={() => setShowAttachPicker(false)}
          onPick={handleAttachRecord}
        />
      </ChatPickerErrorBoundary>

      {showScheduler && (
        <ScheduleSheet
          onClose={() => setShowScheduler(false)}
          onPick={handleSchedule}
        />
      )}

      {showScheduledList && (
        <ScheduledListSheet
          items={scheduled}
          onClose={() => setShowScheduledList(false)}
          onCancel={(id) => { cancelScheduled(id); toast.success("Cancelled · تم الإلغاء"); }}
        />
      )}
    </div>

  );
}

/* ───────── Schedule sheet ───────── */

function ScheduleSheet({ onClose, onPick }: { onClose: () => void; onPick: (iso: string) => void }) {
  const [custom, setCustom] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    // datetime-local format
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const presets: { label: string; labelAr: string; ms: number }[] = [
    { label: "In 1 hour", labelAr: "خلال ساعة", ms: 60 * 60 * 1000 },
    { label: "Tonight 8 PM", labelAr: "الليلة ٨ مساءً", ms: tonightAt(20) },
    { label: "Tomorrow 9 AM", labelAr: "غداً ٩ صباحاً", ms: tomorrowAt(9) },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div
        className="w-full max-w-[420px] rounded-t-3xl p-5 animate-slide-up"
        style={{ background: "var(--white)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock size={18} style={{ color: "var(--teal-deep)" }} />
          <p className="text-[15px] font-bold" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>
            Schedule message
          </p>
          <p className="font-arabic text-[12px] ml-auto" dir="rtl" style={{ color: "var(--gray)" }}>جدولة الرسالة</p>
        </div>
        <div className="space-y-2">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => onPick(new Date(Date.now() + p.ms).toISOString())}
              className="w-full text-left rounded-2xl px-4 py-3 btn-press"
              style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
            >
              <p className="text-[13px] font-semibold" style={{ color: "var(--navy)" }}>{p.label}</p>
              <p className="font-arabic text-[11px]" dir="rtl" style={{ color: "var(--gray)" }}>{p.labelAr}</p>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <p className="text-[11px] font-mono tracking-wider mb-1" style={{ color: "var(--gold)" }}>
            CUSTOM · مخصص
          </p>
          <input
            type="datetime-local"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-[13px] outline-none"
            style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}
          />
          <button
            onClick={() => {
              const ts = new Date(custom).getTime();
              if (!ts || ts < Date.now()) {
                toast.error("Pick a future time · اختر وقتاً قادم");
                return;
              }
              onPick(new Date(ts).toISOString());
            }}
            className="mt-2 w-full rounded-2xl py-3 text-[13px] font-bold btn-press"
            style={{ background: "var(--teal-deep)", color: "#fff" }}
          >
            Schedule · جدولة
          </button>
        </div>
        <button onClick={onClose} className="mt-3 w-full rounded-2xl py-2.5 text-[12px] btn-press" style={{ color: "var(--gray)" }}>
          Cancel · إلغاء
        </button>
      </div>
    </div>
  );
}

function ScheduledListSheet({
  items,
  onClose,
  onCancel,
}: {
  items: ScheduledMessage[];
  onClose: () => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-t-3xl p-5 max-h-[70vh] flex flex-col" style={{ background: "var(--white)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock size={18} style={{ color: "var(--teal-deep)" }} />
          <p className="text-[15px] font-bold" style={{ color: "var(--navy)" }}>Scheduled messages</p>
          <p className="font-arabic text-[12px] ml-auto" dir="rtl" style={{ color: "var(--gray)" }}>الرسائل المجدولة</p>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {items.length === 0 && <p className="text-center text-[12px] py-6" style={{ color: "var(--gray)" }}>None scheduled · لا شيء</p>}
          {items.map((s) => (
            <div key={s.id} className="rounded-2xl px-3 py-2.5 flex items-start gap-2" style={{ background: "var(--off-white)", border: "1px solid var(--gray-light)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold" style={{ color: "var(--teal-deep)" }}>
                  {new Date(s.scheduledFor).toLocaleString()}
                </p>
                <p className="text-[12px] mt-0.5 line-clamp-3" dir="auto" style={{ color: "var(--ink)" }}>
                  {s.body.replace(/\[\[RUFAYQ_ATTACH:[^\]]+\]\]/g, "📎 attachment")}
                </p>
              </div>
              <button onClick={() => onCancel(s.id)} className="p-1.5 rounded-full btn-press" aria-label="Cancel · إلغاء">
                <X size={14} style={{ color: "var(--gray)" }} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-3 w-full rounded-2xl py-2.5 text-[12px] btn-press" style={{ color: "var(--gray)" }}>
          Close · إغلاق
        </button>
      </div>
    </div>
  );
}

function tonightAt(hour: number): number {
  const now = new Date();
  const t = new Date(now);
  t.setHours(hour, 0, 0, 0);
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t.getTime() - now.getTime();
}
function tomorrowAt(hour: number): number {
  const now = new Date();
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  t.setHours(hour, 0, 0, 0);
  return t.getTime() - now.getTime();
}
