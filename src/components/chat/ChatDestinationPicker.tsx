import { useEffect, useState } from "react";
import { X, ChevronRight, Stethoscope, User, Sparkles } from "lucide-react";
import { useChatInbox, type ChatThreadRow } from "@/hooks/useChatInbox";
import { useResolvedContact } from "@/hooks/useResolvedContact";
import type { PickedRecord } from "@/components/chat/ChatRecordsPicker";

export type ChatDestination =
  | { kind: "ai"; persona: "medical" | "shopping" | "tour" }
  | { kind: "thread"; thread: ChatThreadRow };

interface Props {
  open: boolean;
  attachment: PickedRecord | null;
  onClose: () => void;
  onPick: (dest: ChatDestination) => void;
}

const AI_BOTS: { key: "medical" | "shopping" | "tour"; emoji: string; en: string; ar: string; tagline: string }[] = [
  { key: "medical", emoji: "🩺", en: "Medical AI", ar: "الذكاء الطبي", tagline: "Medications, reports & care" },
  { key: "shopping", emoji: "🛍️", en: "Shopping AI", ar: "ذكاء التسوق", tagline: "Compare, deals & sizing" },
  { key: "tour", emoji: "🗺️", en: "Tour Guide AI", ar: "المرشد السياحي", tagline: "Places, history & logistics" },
];

function ThreadRow({ thread, onPick }: { thread: ChatThreadRow; onPick: () => void }) {
  const kind = thread.kind === "provider" ? "provider" : "direct";
  const contact = useResolvedContact(thread.id, kind);
  const displayName = contact?.name ?? thread.title ?? "Conversation";
  const initials = (contact?.initials ?? displayName.trim().slice(0, 1).toUpperCase()) || "?";
  const avatarUrl = contact?.avatarUrl ?? null;
  return (
    <button
      onClick={onPick}
      className="w-full text-left rounded-xl p-3 btn-press flex items-center gap-3"
      style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          background: avatarUrl ? "transparent" : kind === "provider" ? "var(--teal-deep)" : "var(--off-white)",
          color: kind === "provider" ? "#fff" : "var(--teal-deep)",
          border: "1px solid var(--gray-light)",
          fontFamily: "'DM Sans'",
          fontWeight: 700,
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : kind === "provider" ? (
          <Stethoscope size={16} />
        ) : (
          initials || <User size={16} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-bold truncate" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>
          {displayName}
        </p>
        <p className="text-[10.5px] truncate" style={{ color: "var(--gray)" }}>
          {kind === "provider" ? "Care provider · مزود الرعاية" : "Direct message · رسالة مباشرة"}
        </p>
      </div>
      <ChevronRight size={14} style={{ color: "var(--teal-deep)" }} />
    </button>
  );
}

/**
 * Destination picker shown when a record is being "sent to chat". The user
 * chooses a target (AI persona or an existing human thread) and the caller
 * pins the attachment to that destination's composer — no intermediate
 * upload sheet is shown.
 */
export default function ChatDestinationPicker({ open, attachment, onClose, onPick }: Props) {
  const { threads, loading } = useChatInbox();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!open) return null;

  const humanThreads = threads.filter((t) => t.kind !== "ai");

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        className="relative animate-slide-up rounded-t-3xl flex flex-col"
        style={{ background: "var(--white)", maxHeight: "82%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <div style={{ width: 36, height: 4, background: "#DEE4E9", borderRadius: 2 }} />
        </div>
        <div className="px-5 pt-3 pb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl" style={{ color: "var(--navy)" }}>Send to…</p>
            <p className="font-arabic text-sm" dir="rtl" style={{ color: "var(--gray)" }}>أرسل إلى…</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full btn-press shrink-0" aria-label="Close">
            <X size={18} style={{ color: "var(--gray)" }} />
          </button>
        </div>

        {attachment && (
          <div className="mx-5 mt-2 rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background: "var(--off-white)", border: "1px solid var(--gold)" }}
          >
            <span className="text-base shrink-0">{attachment.kind === "travel" ? "✈️" : "🩺"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold truncate" style={{ color: "var(--navy)" }}>{attachment.label}</p>
              <p className="text-[10.5px] truncate" style={{ color: "var(--gray)" }}>
                {attachment.file_name} · {attachment.sourceLabelEn}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ WebkitOverflowScrolling: "touch" }}>
          <section>
            <p className="text-[10px] font-mono tracking-wider mb-2" style={{ color: "var(--gold)" }}>
              AI COMPANIONS · <span className="font-arabic" dir="rtl">رفقاء الذكاء</span>
            </p>
            <div className="space-y-2">
              {AI_BOTS.map((b) => (
                <button
                  key={b.key}
                  onClick={() => onPick({ kind: "ai", persona: b.key })}
                  className="w-full text-left rounded-xl p-3 btn-press flex items-center gap-3"
                  style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: "var(--off-white)" }}>
                    {b.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold truncate" style={{ color: "var(--navy)", fontFamily: "'DM Sans'" }}>{b.en}</p>
                    <p className="font-arabic text-[11px] truncate" dir="rtl" style={{ color: "var(--gray)" }}>{b.ar}</p>
                    <p className="text-[10px] truncate" style={{ color: "var(--gray)" }}>{b.tagline}</p>
                  </div>
                  <Sparkles size={14} style={{ color: "var(--teal-deep)" }} />
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-[10px] font-mono tracking-wider mb-2" style={{ color: "var(--gold)" }}>
              DIRECT MESSAGES · <span className="font-arabic" dir="rtl">المحادثات المباشرة</span>
            </p>
            {loading ? (
              <p className="text-[12px] text-center py-4" style={{ color: "var(--gray)" }}>
                Loading… · جارٍ التحميل
              </p>
            ) : humanThreads.length === 0 ? (
              <p className="text-[12px] text-center py-4" style={{ color: "var(--gray)" }}>
                No direct chats yet · لا توجد محادثات بعد
              </p>
            ) : (
              <div className="space-y-2">
                {humanThreads.map((t) => (
                  <ThreadRow
                    key={t.id}
                    thread={t}
                    onPick={() => onPick({ kind: "thread", thread: t })}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <button onClick={onClose} className="w-full py-3 text-[13px] font-medium mb-3 btn-press" style={{ color: "var(--gray)" }}>
          Cancel · <span className="font-arabic">إلغاء</span>
        </button>
      </div>
    </div>
  );
}
