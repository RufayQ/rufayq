import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import StatusBar from "@/components/StatusBar";
import BottomNav from "@/components/BottomNav";
import HomeScreen from "@/screens/HomeScreen";
import JourneyScreen from "@/screens/JourneyScreen";
import RecordsScreen from "@/screens/RecordsScreen";
import ChatScreen from "@/screens/ChatScreen";
import CareHubScreen from "@/screens/CareHubScreen";
import MedicationsScreen from "@/screens/MedicationsScreen";
import PricingScreen from "@/screens/PricingScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import LoginScreen from "@/screens/LoginScreen";
import ScannerWizard from "@/screens/ScannerWizard";
import SettingsScreen from "@/screens/SettingsScreen";
import SupportScreen from "@/screens/SupportScreen";
import RoleSelectorScreen, { getStoredRole, type AppRolePref } from "@/screens/RoleSelectorScreen";
import { onDeepLink, type DeepLinkTarget } from "@/lib/native/deepLinks";
import { registerPush } from "@/lib/native/push";
import TrialLockBanner from "@/components/TrialLockBanner";
import HomeScreenEmpty from "@/screens/HomeScreenEmpty";
import TourGuide from "@/components/TourGuide";
import TourRunner from "@/components/TourRunner";
import { useFreshStart } from "@/hooks/useFreshStart";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useTourSystem } from "@/hooks/useTourSystem";

type Tab = "home" | "journey" | "records" | "carehub" | "chat";
type AppView = "onboarding" | "login" | "role" | "main" | "medications" | "profile" | "settings" | "pricing" | "support";

const toastMessages: Record<string, { en: string; ar: string }> = {
  flight: { en: "✓ Flight added to your Transport Timeline", ar: "✓ أُضيفت الرحلة إلى جدول تنقلك" },
  train: { en: "✓ Train ticket added to Transport Timeline", ar: "✓ أُضيفت تذكرة القطار لجدول تنقلك" },
  hotel: { en: "✓ Hotel added to your Stay", ar: "✓ أُضيف الفندق إلى إقامتك" },
  lab: { en: "✓ Lab results saved · Check Records", ar: "✓ حُفظت نتائج التحاليل" },
  prescription: { en: "✓ Medications updated from prescription", ar: "✓ حُدّثت الأدوية من الوصفة" },
  discharge: { en: "✓ Discharge pack saved · Care Plan updated", ar: "✓ حُفظت حزمة الخروج" },
  imaging: { en: "✓ Imaging saved to Records", ar: "✓ حُفظت الأشعة في ملفاتك" },
  insurance: { en: "✓ Insurance document saved", ar: "✓ حُفظت وثيقة التأمين" },
  other: { en: "✓ Document saved to Records", ar: "✓ حُفظت الوثيقة في ملفاتك" },
};

const Index = () => {
  const { refresh: refreshTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceSignIn = searchParams.get("signin") === "1";
  const { isFresh, tourPending, markTourDone, reset: resetFresh } = useFreshStart();
  const isGuest = useGuestMode();
  const { activeTour, allowSkip, finishActive } = useTourSystem(tourPending);

  // Staff auto-redirect: if a signed-in staff member lands on the patient app, push them to /admin
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const isStaff = (data || []).some((r: any) => r.role === "admin" || r.role === "moderator");
      if (isStaff) navigate("/admin", { replace: true });
    })();
  }, [navigate]);

  const [appView, setAppView] = useState<AppView>(() => {
    const seen = localStorage.getItem("rufayq_onboarded");
    if (!seen) return "onboarding";
    if (forceSignIn) return "login";
    return "main";
  });

  // If user arrives at /app with no Supabase session, route them through LoginScreen.
  // Guests can still tap "Continue as guest" inside LoginScreen.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user && (forceSignIn || appView === "main")) {
        if (forceSignIn || !localStorage.getItem("rufayq_guest_ok")) {
          setAppView("login");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSignIn]);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerCategory, setScannerCategory] = useState<string | null>(null);
  const [chatContext, setChatContext] = useState<string | null>(null);
  const [badges, setBadges] = useState<Partial<Record<Tab, boolean>>>({
    carehub: true,
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem("rufayq_onboarded", "true");
    setAppView("login");
  };

  const handleLogin = () => {
    // After auth, route through role selector if no preference is stored.
    const existing = getStoredRole();
    setAppView(existing ? "main" : "role");
  };

  const handleRolePicked = (role: AppRolePref) => {
    if (role === "doctor") {
      // Doctors live in the provider portal, not the patient shell.
      navigate("/provider", { replace: true });
      return;
    }
    setAppView("main");
    // Best-effort native push registration; safe no-op on web.
    registerPush({
      rolePref: role,
      onDeepLink: routeDeepLink,
    }).catch((e) => console.warn("[push] register skipped", e));
  };

  /** Route an incoming AA / push deep link into the correct tab/screen. */
  const routeDeepLink = useCallback((target: DeepLinkTarget) => {
    switch (target.kind) {
      case "meds-next":
        setAppView("medications");
        break;
      case "appointment-next":
      case "journey-current":
        setActiveTab("journey");
        setAppView("main");
        break;
      case "emergency":
        setAppView("profile");
        // Try a native dialer hop; harmless on web.
        try { window.location.href = "tel:911"; } catch { /* ignore */ }
        break;
    }
  }, []);

  // Subscribe to deep-link events once on mount.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    onDeepLink((t) => routeDeepLink(t)).then((u) => { unsub = u; });
    return () => { unsub?.(); };
  }, [routeDeepLink]);


  const handleLogout = () => {
    resetFresh();
    localStorage.removeItem("rufayq_onboarded");
    setAppView("onboarding");
  };

  const openScanner = (preselectedCategory?: string) => {
    setScannerCategory(preselectedCategory || null);
    setShowScanner(true);
  };

  const handleScannerSave = useCallback((category: string | null) => {
    setShowScanner(false);
    const msg = toastMessages[category || "other"] || toastMessages.other;

    // Show toast
    toast.success(msg.en, { description: msg.ar, duration: 4000 });

    // Set badge on Records
    setBadges(prev => ({ ...prev, records: true }));

    // Navigate based on category
    if (category === "flight" || category === "train") {
      setActiveTab("journey");
    } else if (category === "hotel") {
      setActiveTab("journey");
    } else if (category === "prescription") {
      setAppView("medications");
    } else if (category === "discharge") {
      setBadges(prev => ({ ...prev, carehub: true }));
      setActiveTab("records");
    } else {
      setActiveTab("records");
    }
    setAppView("main");
  }, []);

  const handleNavigate = (tab: string, context?: string) => {
    if (tab === "medications") {
      setAppView("medications");
    } else if (tab === "scanner") {
      openScanner();
    } else if (tab === "settings") {
      setAppView("settings");
    } else if (tab === "pricing") {
      setAppView("pricing");
    } else if (tab === "support") {
      setAppView("support");
    } else if (tab === "chat" && context) {
      setChatContext(context);
      setActiveTab("chat");
      setAppView("main");
    } else {
      setActiveTab(tab as Tab);
      setAppView("main");
    }
  };

  const handleTabNavigate = (tab: Tab) => {
    setActiveTab(tab);
    if (badges[tab]) {
      setBadges(prev => ({ ...prev, [tab]: false }));
    }
  };

  const renderContent = () => {
    switch (appView) {
      case "onboarding":
        return <OnboardingScreen onComplete={handleOnboardingComplete} />;
      case "login":
        return <LoginScreen onLogin={handleLogin} />;
      case "role":
        return <RoleSelectorScreen onSelect={handleRolePicked} />
      case "medications":
        return <MedicationsScreen onBack={() => setAppView("main")} onConsultAI={(ctx) => handleNavigate("chat", ctx)} />;
      case "profile":
        return <ProfileScreen onBack={() => setAppView("main")} onLogout={handleLogout} />;
      case "settings":
        return <SettingsScreen onBack={() => { refreshTheme(); setAppView("main"); }} />;
      case "pricing":
        return <PricingScreen onBack={() => setAppView("main")} />;
      case "support":
        return <SupportScreen onBack={() => setAppView("main")} />;
      case "main":
        switch (activeTab) {
          case "home":
            return isGuest
              ? <HomeScreen onNavigate={handleNavigate} onProfile={() => setAppView("profile")} />
              : <HomeScreenEmpty onNavigate={handleNavigate} onProfile={() => setAppView("profile")} />;
          case "journey": return <JourneyScreen onOpenScanner={openScanner} onNavigate={handleNavigate} />;
          case "records": return <RecordsScreen onOpenScanner={() => openScanner()} onNavigate={handleNavigate} />;
          case "carehub": return <CareHubScreen />;
          case "chat": return <ChatScreen onOpenScanner={() => openScanner()} initialContext={chatContext} onClearContext={() => setChatContext(null)} onUpgrade={() => setAppView("pricing")} />;
        }
    }
  };

  const showNav = appView === "main";
  const showStatusBar = appView !== "onboarding";

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--phone-frame)" }}>
      <div
        className="relative flex flex-col overflow-hidden max-[500px]:!w-full max-[500px]:!h-screen max-[500px]:!rounded-none max-[500px]:!shadow-none"
        style={{
          width: 390,
          height: "min(844px, calc(100vh - 48px))",
          borderRadius: 44,
          background: "#000",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 8px var(--phone-ring), 0 0 0 10px var(--phone-frame)",
        }}
      >
        {showStatusBar && (
          <div style={{ background: appView === "login" ? "var(--off-white)" : "linear-gradient(135deg, var(--header-teal-from), var(--header-teal-to))" }}>
            <StatusBar dark={appView === "login"} showLanguage />
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--off-white)" }}>
          {appView === "main" && <TrialLockBanner onUpgrade={() => setAppView("pricing")} />}
          {renderContent()}
        </div>

        {showNav && <BottomNav active={activeTab} onNavigate={handleTabNavigate} badges={badges} />}

        {showScanner && (
          <ScannerWizard
            onClose={() => setShowScanner(false)}
            preselectedCategory={scannerCategory}
            onSave={handleScannerSave}
          />
        )}

        {/* First-launch tour for newly registered users */}
        {appView === "main" && tourPending && (
          <TourGuide onFinish={markTourDone} />
        )}

        {/* Feature/element tours from the tour registry (lib/tours.ts) */}
        {appView === "main" && !tourPending && activeTour && (
          <TourRunner tour={activeTour} onFinish={finishActive} allowSkip={allowSkip} />
        )}
      </div>
    </div>
  );
};

export default Index;