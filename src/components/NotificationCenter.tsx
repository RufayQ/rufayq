import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X, MessageCircle, BellRing } from "lucide-react";
import { usePatientNotifications } from "@/hooks/usePatientNotifications";
import { useChatInbox } from "@/hooks/useChatInbox";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  color?: string;
  /** Navigate to a deep-link or in-app route (system alerts use this). */
  onNavigate?: (link: string) => void;
  /** Open a specific chat thread when the user taps a chat row. */
  onOpenThread?: (threadId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Tab = "all" | "chats" | "alerts";

/**
 * Notification Center — a single screen that aggregates:
 *   1. System / patient_notifications (medication, appointment, claim, etc.)
 *   2. Unread chat threads (from useChatInbox)
 * The bell badge shows the combined unread count.
 */
const NotificationCenter = ({ color = "hsl(var(--primary-foreground))", onNavigate, onOpenThread, open: openProp, onOpenChange }: Props) => {
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? !!openProp : openInternal;
  const setOpen = (next: boolean) => {
    if (!isControlled) setOpenInternal(next);
    onOpenChange?.(next);
  };
  const [tab, setTab] = useState<Tab>("all");

  const { items, unreadCount: alertUnread, markRead, markAllRead } = usePatientNotifications();
  const { threads, unreadByThread, totalUnread: chatUnread, participants } = useChatInbox();
  const { showEn, showAr } = useLanguage();

  const totalUnread = alertUnread + chatUnread;

  const unreadThreads = threads.filter((t) => (unreadByThread[t.id] ?? 0) > 0);
  const displayedAlerts = tab === "chats" ? [] : items;
  const displayedThreads = tab === "alerts" ? [] : unreadThreads;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const overlay = open ? createPortal(
    <div className="fixed inset-0 z-[1000] flex justify-center bg-background/80 backdrop-blur-xl sm:items-center sm:p-5">
      <div className="flex h-[100dvh] w-full max-w-[390px] flex-col overflow-hidden bg-card text-card-foreground shadow-2xl sm:h-[min(844px,calc(100dvh-48px))] sm:rounded-[32px]">
        {/* Header */}
        <div className="relative overflow-hidden px-5 pt-5 pb-4" style={{ background: "linear-gradient(155deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 62%, hsl(var(--background)) 100%)" }}>
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-accent/25" />
          <div className="pointer-events-none absolute right-8 top-10 h-28 w-28 rounded-full border border-primary-foreground/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground/55">RufayQ inbox</p>
              {showEn && <p className="font-display text-[30px] leading-none text-primary-foreground">Notifications</p>}
              {showAr && <p className="mt-1 font-arabic text-[13px] text-accent" dir="rtl">مركز التنبيهات</p>}
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground"
            >
              <X size={21} />
            </button>
          </div>

          {/* Tabs */}
          <div className="relative mt-5 flex gap-2 overflow-x-auto no-scrollbar">
            {(["all", "chats", "alerts"] as Tab[]).map((t) => {
              const count = t === "all" ? totalUnread : t === "chats" ? chatUnread : alertUnread;
              const labelEn = t === "all" ? "All" : t === "chats" ? "Messages" : "Alerts";
              const labelAr = t === "all" ? "الكل" : t === "chats" ? "الرسائل" : "التنبيهات";
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition"
                  style={{
                    background: tab === t ? "hsl(var(--primary-foreground))" : "hsl(var(--primary-foreground) / 0.12)",
                    color: tab === t ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))",
                    borderColor: "hsl(var(--primary-foreground) / 0.2)",
                  }}
                >
                  <span>{showAr && !showEn ? labelAr : labelEn}</span>
                  {count > 0 && (
                    <span className="min-w-4 rounded-full bg-destructive px-1.5 text-center text-[9px] font-bold text-destructive-foreground">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </button>
              );
            })}
            {alertUnread > 0 && tab !== "chats" && (
              <button onClick={markAllRead} className="ml-auto shrink-0 rounded-full px-3 py-2 text-[10px] font-semibold text-primary-foreground/80 underline underline-offset-4">
                {showAr && !showEn ? "تعليم الكل" : "Mark read"}
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {displayedThreads.length === 0 && displayedAlerts.length === 0 && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-muted-foreground">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                <Bell size={30} />
              </div>
              {showEn && <p className="font-display text-[24px] leading-tight text-card-foreground">You're all caught up</p>}
              {showAr && <p className="mt-1 font-arabic text-sm" dir="rtl">لا توجد تنبيهات جديدة</p>}
            </div>
          )}

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative p-1" aria-label="Notifications">
        <Bell size={18} color={color} />
        {totalUnread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: "#E94560", color: "#fff" }}
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "var(--off-white)" }}>
          {/* Header */}
          <div className="px-5 pt-3 pb-2" style={{ background: "linear-gradient(160deg, var(--header-dark-from), var(--header-teal-from))" }}>
            <div className="flex items-center justify-between">
              <div>
                {showEn && <p className="font-display text-lg text-white">Notifications</p>}
                {showAr && <p className="text-[11px]" dir="rtl" style={{ color: "var(--gold)" }}>مركز التنبيهات</p>}
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close"><X size={22} color="#fff" /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-3">
              {(["all", "chats", "alerts"] as Tab[]).map((t) => {
                const count = t === "all" ? totalUnread : t === "chats" ? chatUnread : alertUnread;
                const labelEn = t === "all" ? "All" : t === "chats" ? "Messages" : "Alerts";
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition"
                    style={{
                      background: tab === t ? "#fff" : "rgba(255,255,255,0.12)",
                      color: tab === t ? "var(--navy)" : "#fff",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {labelEn}
                    {count > 0 && (
                      <span
                        className="text-[9px] px-1.5 rounded-full"
                        style={{
                          background: tab === t ? "#E94560" : "rgba(255,255,255,0.25)",
                          color: "#fff",
                          minWidth: 16,
                          textAlign: "center",
                        }}
                      >
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="ml-auto">
                {alertUnread > 0 && tab !== "chats" && (
                  <button onClick={markAllRead} className="text-[10px] underline" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {showEn ? "Mark read" : "تعليم الكل"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ color: "var(--ink)" }}>
            {displayedThreads.length === 0 && displayedAlerts.length === 0 && (
              <div className="text-center py-16" style={{ color: "var(--gray)" }}>
                <Bell size={32} className="mx-auto mb-3" style={{ color: "var(--teal-deep)", opacity: 0.55 }} />
                {showEn && <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>You're all caught up</p>}
                {showAr && <p className="text-xs mt-1 font-arabic" dir="rtl" style={{ color: "var(--gray)" }}>لا توجد تنبيهات جديدة</p>}
              </div>
            )}

            {/* Unread chats */}
            {displayedThreads.map((t) => {
              const cnt = unreadByThread[t.id] ?? 0;
              const otherDisplay =
                (participants[t.id] || []).find((p) => p.display_name)?.display_name ||
                t.title ||
                "Conversation";
              return (
                <button
                  key={`chat-${t.id}`}
                  onClick={() => {
                    onOpenThread?.(t.id);
                    setOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-xl transition-all flex items-start gap-3"
                  style={{
                    background: "rgba(15,181,201,0.08)",
                    border: "1px solid rgba(15,181,201,0.25)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--teal-deep)", color: "#fff" }}
                  >
                    <MessageCircle size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--navy)" }}>{otherDisplay}</p>
                      <span
                        className="text-[10px] px-1.5 rounded-full font-bold"
                        style={{ background: "#E94560", color: "#fff", minWidth: 18, textAlign: "center" }}
                      >
                        {cnt > 9 ? "9+" : cnt}
                      </span>
                    </div>
                    {t.last_message_preview && (
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--ink)", opacity: 0.7 }}>{t.last_message_preview}</p>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>{new Date(t.last_message_at).toLocaleString()}</p>
                  </div>
                </button>
              );
            })}

            {/* System alerts */}
            {displayedAlerts.map((n) => (
              <button
                key={`alert-${n.id}`}
                onClick={() => {
                  markRead(n.id);
                  if (n.link && onNavigate) onNavigate(n.link);
                  setOpen(false);
                }}
                className="w-full text-left p-3 rounded-xl transition-all flex items-start gap-3"
                style={{
                  background: n.is_read ? "rgba(0,0,0,0.02)" : "rgba(15,181,201,0.08)",
                  border: `1px solid ${n.is_read ? "rgba(0,0,0,0.06)" : "rgba(15,181,201,0.25)"}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: n.is_read ? "rgba(0,0,0,0.08)" : "var(--gold)", color: "#fff" }}
                >
                  <BellRing size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  {showEn && <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{n.title}</p>}
                  {showAr && n.title_ar && <p className="text-xs mt-0.5 font-arabic" dir="rtl" style={{ color: "var(--gold)" }}>{n.title_ar}</p>}
                  {n.body && <p className="text-xs mt-1" style={{ color: "var(--ink)", opacity: 0.75 }}>{n.body}</p>}
                  <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationCenter;
