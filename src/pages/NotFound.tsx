import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, MessageCircle, FileText } from "lucide-react";
import RufayQLogo from "@/components/RufayQLogo";

const BG_DARK = "#06101A";
const BG_DARK_2 = "#0B1A28";
const BORDER = "rgba(197,150,90,0.12)";
const TEXT = "#E8ECF0";
const TEXT_MUTED = "rgba(232,236,240,0.55)";
const GOLD = "#C5965A";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "404 — Page Not Found · RufayQ";
    console.error("404:", location.pathname);
  }, [location.pathname]);

  const helpfulLinks = [
    { to: "/", icon: Home, en: "Home", ar: "الرئيسية", desc: "Back to RufayQ landing" },
    { to: "/app", icon: Search, en: "Open the App", ar: "افتح التطبيق", desc: "Launch the medical companion" },
    { to: "/providers", icon: MessageCircle, en: "For Providers", ar: "للمزوّدين", desc: "Hospitals, clinics, vendors" },
    { to: "/privacy", icon: FileText, en: "Privacy & Terms", ar: "الخصوصية والشروط", desc: "Legal documents" },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: BG_DARK, color: TEXT, fontFamily: "'DM Sans', system-ui" }}>
      <Link to="/" className="flex items-center gap-2 mb-12">
        <RufayQLogo size={32} variant="light" />
        <span className="font-display text-xl"><span style={{ color: TEXT }}>Rufay</span><span className="font-bold" style={{ color: GOLD }}>Q</span></span>
      </Link>

      <div className="text-center max-w-2xl">
        <p className="font-mono text-xs tracking-[0.3em] mb-6" style={{ color: GOLD }}>ERROR 404</p>
        <h1 className="font-display text-6xl md:text-7xl mb-4 tracking-tight" style={{ fontWeight: 300 }}>
          Page not found
        </h1>
        <p className="font-arabic text-2xl mb-8" dir="rtl" style={{ color: GOLD }}>الصفحة غير موجودة</p>
        <p className="text-base mb-12 max-w-md mx-auto" style={{ color: TEXT_MUTED }}>
          The page <code style={{ color: GOLD }}>{location.pathname}</code> doesn't exist or has been moved. Try one of these instead:
        </p>

        <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          {helpfulLinks.map((l) => (
            <Link key={l.to} to={l.to} className="rounded-2xl p-5 text-left transition-all hover:-translate-y-1 hover:bg-white/[0.04]" style={{ background: BG_DARK_2, border: `1px solid ${BORDER}` }}>
              <l.icon size={20} color={GOLD} className="mb-3" />
              <p className="text-sm font-semibold mb-0.5" style={{ color: TEXT }}>{l.en}</p>
              <p className="font-arabic text-xs mb-2" dir="rtl" style={{ color: GOLD }}>{l.ar}</p>
              <p className="text-xs" style={{ color: TEXT_MUTED }}>{l.desc}</p>
            </Link>
          ))}
        </div>

        <Link to="/" className="inline-flex items-center gap-2 mt-12 px-7 py-3.5 rounded-full text-sm font-semibold transition-all hover:scale-105" style={{ background: GOLD, color: BG_DARK }}>
          ← Back to homepage
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
