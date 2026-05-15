import { useState } from "react";
import { Bell, X } from "lucide-react";
import { usePatientNotifications } from "@/hooks/usePatientNotifications";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  color?: string;
  onNavigate?: (link: string) => void;
  /** Optional controlled-open API. When omitted, the bell manages its own open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const NotificationBell = ({ color = "#fff", onNavigate, open: openProp, onOpenChange }: Props) => {
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? !!openProp : openInternal;
  const setOpen = (next: boolean) => {
    if (!isControlled) setOpenInternal(next);
    onOpenChange?.(next);
  };
  const { items, unreadCount, markRead, markAllRead } = usePatientNotifications();
  const { showEn, showAr } = useLanguage();

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative p-1" aria-label="Notifications">
        <Bell size={18} color={color} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: "#E94560", color: "#fff" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute inset-0 z-[100] flex flex-col" style={{ background: "var(--off-white)" }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
            <div>
              {showEn && <p className="font-display text-lg" style={{ color: "var(--navy)" }}>Notifications</p>}
              {showAr && <p className="text-[11px]" dir="rtl" style={{ color: "var(--gold)" }}>التنبيهات</p>}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] px-2 py-1 rounded-full" style={{ background: "var(--teal)", color: "#fff" }}>
                  {showEn && <span>Mark all read</span>}
                  {showEn && showAr && <span> · </span>}
                  {showAr && <span dir="rtl">تعليم الكل</span>}
                </button>
              )}
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {items.length === 0 && (
              <div className="text-center py-12">
                <Bell size={32} className="mx-auto opacity-30 mb-3" />
                {showEn && <p className="text-sm opacity-60">No notifications yet</p>}
                {showAr && <p className="text-xs opacity-40" dir="rtl">لا توجد تنبيهات</p>}
              </div>
            )}
            {items.map(n => (
              <button
                key={n.id}
                onClick={() => { markRead(n.id); if (n.link && onNavigate) onNavigate(n.link); setOpen(false); }}
                className="w-full text-left p-3 rounded-xl transition-all"
                style={{
                  background: n.is_read ? "rgba(0,0,0,0.02)" : "rgba(15,181,201,0.08)",
                  border: `1px solid ${n.is_read ? "rgba(0,0,0,0.06)" : "rgba(15,181,201,0.25)"}`,
                }}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--teal)" }} />}
                  <div className="flex-1 min-w-0">
                    {showEn && <p className="font-semibold text-sm" style={{ color: "var(--navy)" }}>{n.title}</p>}
                    {showAr && n.title_ar && <p className="text-xs mt-0.5" dir="rtl" style={{ color: "var(--gold)" }}>{n.title_ar}</p>}
                    {n.body && <p className="text-xs mt-1 opacity-70">{n.body}</p>}
                    <p className="text-[10px] mt-1 opacity-50">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;
