/**
 * Empty-state Home for newly registered patients (no demo data).
 * Encourages first actions: add trip, scan document, ask AI, complete profile.
 */
import RufayQWordmark from "@/components/RufayQWordmark";
import HeaderMenu, { Copy, Share2, RefreshCw, Bell, Settings, HelpCircle } from "@/components/HeaderMenu";
import NotificationBell from "@/components/NotificationBell";
import { CreditCard, Plus, ScanLine, MessageCircle, FileText, Map, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onNavigate: (tab: string, context?: string) => void;
  onProfile: () => void;
}

const HomeScreenEmpty = ({ onNavigate, onProfile }: Props) => {
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  }).toUpperCase();

  const menuItems = [
    { icon: <RefreshCw size={14} />, label: "Refresh", labelAr: "تحديث", onClick: () => window.location.reload() },
    { icon: <Bell size={14} />, label: "Notifications", labelAr: "الإشعارات", onClick: () => toast("All caught up · لا توجد إشعارات") },
    { icon: <Copy size={14} />, label: "Copy welcome", labelAr: "نسخ الترحيب", onClick: () => { navigator.clipboard.writeText("Welcome to RufayQ"); toast("Copied · تم النسخ"); } },
    { icon: <Share2 size={14} />, label: "Share App", labelAr: "مشاركة التطبيق", onClick: () => { const url = window.location.origin; window.open(`https://wa.me/?text=${encodeURIComponent("Try RufayQ · جرّب رُفَيِّق " + url)}`, "_blank"); } },
    { icon: <CreditCard size={14} />, label: "Subscriptions", labelAr: "الاشتراكات", onClick: () => onNavigate("pricing") },
    { icon: <Wallet size={14} />, label: "Wallet & Refunds", labelAr: "المحفظة والاستردادات", onClick: () => onNavigate("wallet") },
    { icon: <Settings size={14} />, label: "Settings", labelAr: "الإعدادات", onClick: () => onNavigate("settings") },
    { icon: <HelpCircle size={14} />, label: "Help & Support", labelAr: "المساعدة", onClick: () => onNavigate("support") },
  ];

  return (
    <div className="flex flex-col" style={{ height: 0, flex: 1, overflow: "hidden" }}>
      {/* Header */}
      <div className="relative px-5 pt-3 pb-16 overflow-hidden" style={{ background: "linear-gradient(145deg, var(--header-teal-from), var(--header-teal-to))" }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.15)" }} />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full" style={{ border: "1px solid rgba(197,150,90,0.08)" }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <RufayQWordmark size="sm" variant="light" />
            <div className="flex items-center gap-2">
              <NotificationBell color="#fff" />
              <HeaderMenu items={menuItems} />
              <button
                onClick={onProfile}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold btn-press"
                style={{ background: "var(--gold)", color: "#fff" }}
                aria-label="Profile"
              >
                <Sparkles size={14} />
              </button>
            </div>
          </div>
          <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>{dateStr}</p>
          <p className="font-display text-xl italic text-white" style={{ fontWeight: 300 }}>Welcome to RufayQ</p>
          <p className="font-arabic text-sm mt-0.5" dir="rtl" style={{ color: "rgba(255,255,255,0.55)" }}>أهلاً بك في رُفَيِّق</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 -mt-8 pb-6 space-y-3 relative z-10" style={{ background: "transparent", WebkitOverflowScrolling: "touch" }}>
        {/* Hero empty card */}
        <div className="rounded-2xl p-6 text-center animate-fade-in-up" style={{ background: "var(--white)", boxShadow: "0 8px 32px rgba(0,77,91,0.14)" }}>
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: "var(--gold-pale)", border: "1px solid var(--gold)" }}>
            <Sparkles size={26} color="var(--gold)" />
          </div>
          <p className="font-mono text-[10px] tracking-widest mb-1" style={{ color: "var(--gold)" }}>FRESH START · بداية جديدة</p>
          <h2 className="font-display text-lg" style={{ color: "var(--navy)" }}>Your app is ready</h2>
          <p className="font-arabic text-xs mt-0.5" dir="rtl" style={{ color: "var(--teal-deep)" }}>تطبيقك جاهز للاستخدام</p>
          <p className="text-[12px] mt-3 leading-relaxed" style={{ color: "var(--gray)" }}>
            No data yet. Add your first trip, scan a document, or ask the AI assistant anything.
          </p>
          <p className="font-arabic text-[11px] mt-1 leading-relaxed" dir="rtl" style={{ color: "var(--gray)" }}>
            لا توجد بيانات بعد. أضف رحلتك الأولى أو امسح وثيقة أو اسأل المساعد الذكي.
          </p>
          <button
            onClick={() => onNavigate("journey")}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold btn-press"
            style={{ background: "var(--teal-deep)", color: "#fff" }}
          >
            <Plus size={12} /> Add your first trip
          </button>
        </div>

        {/* Quick actions */}
        <div className="stagger-2">
          <p className="font-mono text-[10px] tracking-widest mb-2" style={{ color: "var(--gray)" }}>GET STARTED · ابدأ من هنا</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Map size={20} color="var(--teal-deep)" />, label: "New Trip", labelAr: "رحلة جديدة", tab: "journey" },
              { icon: <ScanLine size={20} color="var(--gold)" />, label: "Scan Document", labelAr: "امسح وثيقة", tab: "scanner" },
              { icon: <MessageCircle size={20} color="var(--teal-deep)" />, label: "Ask AI", labelAr: "اسأل المساعد", tab: "chat" },
              { icon: <FileText size={20} color="var(--gold)" />, label: "My Records", labelAr: "ملفاتي", tab: "records" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => onNavigate(a.tab)}
                className="rounded-xl p-3.5 flex flex-col items-center gap-1.5 card-press"
                style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}
              >
                {a.icon}
                <span className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{a.label}</span>
                <span className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{a.labelAr}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tip */}
        <button
          onClick={() => onNavigate("support")}
          className="w-full rounded-xl p-3.5 flex items-center gap-3 text-left stagger-3 card-press"
          style={{ background: "var(--gold-pale)", borderLeft: "3px solid var(--gold)" }}
        >
          <span className="text-xl">💡</span>
          <div className="flex-1">
            <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>Need help getting started?</p>
            <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>هل تحتاج مساعدة في البدء؟ تواصل مع فريق الدعم</p>
          </div>
          <span className="text-lg" style={{ color: "var(--gold)" }}>›</span>
        </button>
      </div>
    </div>
  );
};

export default HomeScreenEmpty;
