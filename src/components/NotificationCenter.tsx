import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellRing, CalendarClock, Check, MessageCircle, Pill, Receipt, Settings2, Stethoscope, X } from "lucide-react";
import { usePatientNotifications } from "@/hooks/usePatientNotifications";
import { useChatInbox } from "@/hooks/useChatInbox";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotificationPrefs, type NotificationCategoryId } from "@/hooks/useNotificationPrefs";

interface Props {
  color?: string;
  /** Navigate to a deep-link or in-app route (system alerts use this). */
  onNavigate?: (link: string) => void;
  /** Open a specific chat thread when the user taps a chat row. */
  onOpenThread?: (threadId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Tab = "all" | "chats" | "alerts" | "history";
type Category = "all" | "appointments" | "meds" | "care" | "billing";

const CATEGORY_KINDS: Record<Exclude<Category, "all">, string[]> = {
  appointments: ["appointment"],
  meds: ["medication"],
  care: ["admission", "instruction", "announcement", "consent_request"],
  billing: ["invoice", "claim_request", "authorization", "credit_note"],
};

const CATEGORY_META: { id: Category; en: string; ar: string; Icon: typeof Bell }[] = [
  { id: "all", en: "All", ar: "الكل", Icon: Bell },
  { id: "appointments", en: "Appointments", ar: "المواعيد", Icon: CalendarClock },
  { id: "meds", en: "Medications", ar: "الأدوية", Icon: Pill },
  { id: "care", en: "Care updates", ar: "تحديثات الرعاية", Icon: Stethoscope },
  { id: "billing", en: "Billing", ar: "الفواتير", Icon: Receipt },
];

const NotificationCenter = ({
  color = "hsl(var(--primary-foreground))",
  onNavigate,
  onOpenThread,
  open: openProp,
  onOpenChange,
}: Props) => {
  const [openInternal, setOpenInternal] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const isControlled = openProp !== undefined;
  const open = isControlled ? !!openProp : openInternal;
  const setOpen = (next: boolean) => {
    if (!isControlled) setOpenInternal(next);
    onOpenChange?.(next);
  };

  const { items, unreadCount: alertUnread, markRead, markAllRead } = usePatientNotifications();
  const { threads, unreadByThread, totalUnread: chatUnread, participants } = useChatInbox();
  const { showEn, showAr } = useLanguage();
  const { prefs, toggle: togglePref } = useNotificationPrefs();

  const [categoryFilter, setCategoryFilter] = useState<Category>("all");
  const [prefsOpen, setPrefsOpen] = useState(false);

  // Map an alert's kind → category id (for pref filtering).
  const kindCategory = (kind: string): Exclude<NotificationCategoryId, "chats"> | null => {
    for (const [cat, kinds] of Object.entries(CATEGORY_KINDS) as [Exclude<Category, "all">, string[]][]) {
      if (kinds.includes(kind)) return cat;
    }
    return null;
  };

  // Apply per-category prefs FIRST, then the active tab filter.
  const allowedAlerts = items.filter((n) => {
    const cat = kindCategory(n.kind);
    return cat ? prefs[cat] !== false : true; // unknown kinds always shown
  });
  const allowedChatUnread = prefs.chats === false ? 0 : chatUnread;
  const totalUnread = allowedAlerts.filter((n) => !n.is_read).length + allowedChatUnread;
  const visibleAlertUnread = allowedAlerts.filter((n) => !n.is_read).length;
  const unreadThreads =
    prefs.chats === false ? [] : threads.filter((thread) => (unreadByThread[thread.id] ?? 0) > 0);

  const filteredAlerts =
    categoryFilter === "all"
      ? allowedAlerts
      : allowedAlerts.filter((n) => CATEGORY_KINDS[categoryFilter].includes(n.kind));
  const historyAlerts = [...filteredAlerts]
    .filter((n) => n.is_read)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 50);
  const historyThreads = prefs.chats === false
    ? []
    : [...threads]
        .sort((a, b) => Date.parse(b.last_message_at) - Date.parse(a.last_message_at))
        .slice(0, 30);
  const displayedAlerts =
    tab === "chats" ? [] : tab === "history" ? historyAlerts : filteredAlerts;
  const displayedThreads =
    tab === "alerts" ? [] : tab === "history" ? historyThreads : unreadThreads;
  const filteredUnreadCount = filteredAlerts.filter((n) => !n.is_read).length;
  const markFilteredRead = () => {
    if (categoryFilter === "all") {
      // Mark only the currently-visible (pref-allowed) alerts.
      allowedAlerts.forEach((n) => {
        if (!n.is_read) markRead(n.id);
      });
      return;
    }
    filteredAlerts.forEach((n) => {
      if (!n.is_read) markRead(n.id);
    });
  };
  const showCategoryRow = tab !== "chats";
  const isHistory = tab === "history";
  const activeCategory = CATEGORY_META.find((c) => c.id === categoryFilter)!;

  // Bilingual labels for the prefs panel; mirrors CATEGORY_META plus chats.
  const PREF_ROWS: { id: NotificationCategoryId; en: string; ar: string; Icon: typeof Bell }[] = [
    { id: "chats", en: "Messages", ar: "الرسائل", Icon: MessageCircle },
    { id: "appointments", en: "Appointments", ar: "المواعيد", Icon: CalendarClock },
    { id: "meds", en: "Medications", ar: "الأدوية", Icon: Pill },
    { id: "care", en: "Care updates", ar: "تحديثات الرعاية", Icon: Stethoscope },
    { id: "billing", en: "Billing", ar: "الفواتير", Icon: Receipt },
  ];
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Safety net: if this NotificationCenter unmounts while still open (e.g. the
  // parent swaps it when the user changes tabs), guarantee the body scroll
  // lock is cleared in case any older build or sibling component left one
  // behind. Without this, switching tabs immediately after closing the panel
  // could appear to "freeze" the underlying shell.
  useEffect(() => {
    return () => {
      if (document.body.style.overflow === "hidden") {
        document.body.style.overflow = "";
      }
    };
  }, []);

  const overlay = open && typeof document !== "undefined" ? createPortal(
    <div
      className="fixed inset-0 z-[1000] flex justify-center bg-background/80 backdrop-blur-xl sm:items-center sm:p-5"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex h-[100dvh] w-full max-w-[390px] flex-col overflow-hidden bg-card text-card-foreground shadow-2xl sm:h-[min(844px,calc(100dvh-48px))] sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative overflow-hidden px-5 pb-4 pt-5"
          style={{ background: "linear-gradient(155deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 62%, hsl(var(--background)) 100%)" }}
        >
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-accent/25" />
          <div className="pointer-events-none absolute right-8 top-10 h-28 w-28 rounded-full border border-primary-foreground/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground/55">RufayQ inbox</p>
              {showEn && <p className="font-display text-[30px] leading-none text-primary-foreground">Notifications</p>}
              {showAr && <p className="mt-1 font-arabic text-[13px] text-accent" dir="rtl">مركز التنبيهات</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setPrefsOpen((v) => !v)}
                aria-label={showAr && !showEn ? "تفضيلات الإشعارات" : "Notification preferences"}
                aria-pressed={prefsOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground"
                style={{ background: prefsOpen ? "hsl(var(--primary-foreground) / 0.25)" : undefined }}
              >
                <Settings2 size={18} />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground"
              >
                <X size={21} />
              </button>
            </div>
          </div>

          <div className="relative mt-5 flex gap-2 overflow-x-auto no-scrollbar">
            {(["all", "chats", "alerts", "history"] as Tab[]).map((tabName) => {
              const count =
                tabName === "all"
                  ? totalUnread
                  : tabName === "chats"
                  ? allowedChatUnread
                  : tabName === "alerts"
                  ? visibleAlertUnread
                  : 0;
              const labelEn =
                tabName === "all" ? "All" : tabName === "chats" ? "Messages" : tabName === "alerts" ? "Alerts" : "History";
              const labelAr =
                tabName === "all" ? "الكل" : tabName === "chats" ? "الرسائل" : tabName === "alerts" ? "التنبيهات" : "السجل";
              const isActive = tab === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => setTab(tabName)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition"
                  style={{
                    background: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--primary-foreground) / 0.12)",
                    color: isActive ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))",
                    borderColor: "hsl(var(--primary-foreground) / 0.2)",
                  }}
                >
                  <span>{showAr && !showEn ? labelAr : labelEn}</span>
                  {count > 0 && tabName !== "history" && (
                    <span className="min-w-4 rounded-full bg-destructive px-1.5 text-center text-[9px] font-bold text-destructive-foreground">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredUnreadCount > 0 && tab !== "chats" && tab !== "history" && (
              <button onClick={markFilteredRead} className="ml-auto shrink-0 rounded-full border border-primary-foreground/30 bg-primary-foreground/15 px-3 py-2 text-[11px] font-semibold text-primary-foreground">
                {showAr && !showEn ? `تعليم ${filteredUnreadCount} كمقروء` : `Mark ${filteredUnreadCount} read`}
              </button>
            )}
          </div>

          {showCategoryRow && (
            <div className="relative mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
              {CATEGORY_META.map(({ id, en, ar, Icon }) => {
                const unread =
                  id === "all"
                    ? visibleAlertUnread
                    : allowedAlerts.filter((n) => CATEGORY_KINDS[id as Exclude<Category, "all">].includes(n.kind) && !n.is_read).length;
                const isActive = categoryFilter === id;
                return (
                  <button
                    key={id}
                    onClick={() => setCategoryFilter(id)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition"
                    style={{
                      background: isActive ? "hsl(var(--accent))" : "hsl(var(--primary-foreground) / 0.08)",
                      color: isActive ? "hsl(var(--accent-foreground))" : "hsl(var(--primary-foreground) / 0.85)",
                      borderColor: isActive ? "hsl(var(--accent))" : "hsl(var(--primary-foreground) / 0.18)",
                    }}
                  >
                    <Icon size={13} />
                    <span>{showAr && !showEn ? ar : en}</span>
                    {unread > 0 && (
                      <span className="min-w-[14px] rounded-full bg-destructive px-1 text-center text-[9px] font-bold text-destructive-foreground">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {prefsOpen && (
          <div className="border-b border-border bg-muted/30 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                {showEn && <p className="text-[13px] font-semibold text-card-foreground">Notification preferences</p>}
                {showAr && <p className="font-arabic text-[11px] text-muted-foreground" dir="rtl">تفضيلات الإشعارات</p>}
              </div>
              <button
                onClick={() => setPrefsOpen(false)}
                aria-label="Close preferences"
                className="rounded-full p-1 text-muted-foreground hover:text-card-foreground"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-1.5">
              {PREF_ROWS.map(({ id, en, ar, Icon }) => {
                const enabled = prefs[id] !== false;
                return (
                  <button
                    key={id}
                    onClick={() => togglePref(id)}
                    role="switch"
                    aria-checked={enabled}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left transition active:scale-[0.99]"
                  >
                    <Icon size={14} className="shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      {showEn && <p className="text-[12px] font-semibold text-card-foreground">{en}</p>}
                      {showAr && <p className="font-arabic text-[10px] text-muted-foreground" dir="rtl">{ar}</p>}
                    </div>
                    <span
                      className="relative h-[18px] w-[32px] shrink-0 rounded-full transition"
                      style={{ background: enabled ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.35)" }}
                    >
                      <span
                        className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all"
                        style={{ left: enabled ? 16 : 2 }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {displayedThreads.length === 0 && displayedAlerts.length === 0 && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-muted-foreground">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                <Bell size={30} />
              </div>
              {categoryFilter !== "all" && tab !== "chats" ? (
                <>
                  {showEn && <p className="font-display text-[22px] leading-tight text-card-foreground">No {activeCategory.en.toLowerCase()} notifications</p>}
                  {showAr && <p className="mt-1 font-arabic text-sm" dir="rtl">لا توجد تنبيهات في {activeCategory.ar}</p>}
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className="mt-4 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-[11px] font-semibold text-accent"
                  >
                    {showAr && !showEn ? "عرض الكل" : "Show all"}
                  </button>
                </>
              ) : (
                <>
                  {showEn && <p className="font-display text-[24px] leading-tight text-card-foreground">You're all caught up</p>}
                  {showAr && <p className="mt-1 font-arabic text-sm" dir="rtl">لا توجد تنبيهات جديدة</p>}
                </>
              )}
            </div>
          )}

          {displayedThreads.map((thread) => {
            const count = unreadByThread[thread.id] ?? 0;
            const otherDisplay =
              (participants[thread.id] || []).find((participant) => participant.display_name)?.display_name ||
              thread.title ||
              "Conversation";
            return (
              <button
                key={`chat-${thread.id}`}
                onClick={() => {
                  onOpenThread?.(thread.id);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-left transition active:scale-[0.99]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <MessageCircle size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-card-foreground">{otherDisplay}</p>
                    <span className="min-w-[18px] rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold text-destructive-foreground">
                      {count > 9 ? "9+" : count}
                    </span>
                  </div>
                  {thread.last_message_preview && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{thread.last_message_preview}</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(thread.last_message_at).toLocaleString()}</p>
                </div>
              </button>
            );
          })}

          {displayedAlerts.map((notification) => (
            <div
              key={`alert-${notification.id}`}
              className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                notification.is_read ? "border-border bg-muted/35" : "border-accent/30 bg-accent/10"
              }`}
            >
              <button
                onClick={() => {
                  if (!notification.is_read) markRead(notification.id);
                  if (notification.link && onNavigate) {
                    onNavigate(notification.link);
                    setOpen(false);
                  }
                }}
                className="flex flex-1 items-start gap-3 text-left active:scale-[0.99]"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${notification.is_read ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground"}`}>
                  <BellRing size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  {showEn && <p className="text-sm font-semibold text-card-foreground">{notification.title}</p>}
                  {showAr && notification.title_ar && <p className="mt-0.5 font-arabic text-xs text-accent" dir="rtl">{notification.title_ar}</p>}
                  {notification.body && <p className="mt-1 text-xs text-muted-foreground">{notification.body}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
              </button>
              {!notification.is_read && (
                <button
                  onClick={(e) => { e.stopPropagation(); markRead(notification.id); }}
                  aria-label="Mark as read · تعليم كمقروء"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-accent active:scale-95"
                >
                  <Check size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground backdrop-blur-md"
        aria-label="Notifications"
      >
        <Bell size={18} color={color} />
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
      {overlay}
    </>
  );
};

export default NotificationCenter;
