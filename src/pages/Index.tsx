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
import { CareHubScreen } from "@/features/carehub";
import MedicationsScreen from "@/screens/MedicationsScreen";
import PricingScreen from "@/screens/PricingScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import LoginScreen from "@/screens/LoginScreen";
import ScannerWizard from "@/screens/ScannerWizard";
import SettingsScreen from "@/screens/SettingsScreen";
import SupportScreen from "@/screens/SupportScreen";
import { EmrScreen } from "@/features/emr";
import RoleSelectorScreen, { getStoredRole, clearStoredRole, type AppRolePref } from "@/screens/RoleSelectorScreen";
import { validateLoginRole } from "@/lib/roleValidation";
import { onDeepLink, type DeepLinkTarget } from "@/lib/native/deepLinks";
import { registerPush } from "@/lib/native/push";
import TrialLockBanner from "@/components/TrialLockBanner";
import TourGuide from "@/components/TourGuide";
import TourRunner from "@/components/TourRunner";
import { useFreshStart } from "@/hooks/useFreshStart";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useTourSystem } from "@/hooks/useTourSystem";
import { usePatientBootstrap } from "@/hooks/usePatientBootstrap";

type Tab = "home" | "journey" | "records" | "carehub" | "chat";
type AppView = "onboarding" | "login" | "role" | "main" | "medications" | "profile" | "settings" | "pricing" | "support" | "emr";

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
  // Initialize patient session (ensure_patient + claim guest data + active key).
  // Side-effecting; UI continues painting from cache during bootstrap.
  usePatientBootstrap();

  // Staff auto-redirect: if a signed-in staff member lands on the patient app, push them to /admin.
  // Skip when ?signin=1 is present so the explicit traveler sign-in flow from /auth isn't hijacked.
  useEffect(() => {
    if (forceSignIn) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const isStaff = (data || []).some((r: any) => r.role === "admin" || r.role === "moderator");
      if (isStaff) navigate("/admin", { replace: true });
    })();
  }, [navigate, forceSignIn]);

  const [appView, setAppView] = useState<AppView>(() => {
    const seen = localStorage.getItem("rufayq_onboarded");
    if (!seen) return "onboarding";
    if (forceSignIn) return "login";
    // New flow: pick role BEFORE sign in. If no stored role, show role screen first.
    if (!getStoredRole()) return "role";
    return "main";
  });

  // If user arrives at /app with no Supabase session, route them through
  // role-selector → LoginScreen. Guests can still tap "Continue as guest"
  // inside LoginScreen.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user && (forceSignIn || appView === "main")) {
        if (forceSignIn || !localStorage.getItem("rufayq_guest_ok")) {
          setAppView(getStoredRole() ? "login" : "role");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSignIn]);

  // After returning from an OAuth identity-link redirect, open Profile once.
  useEffect(() => {
    if (searchParams.get("profile") !== "1") return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setAppView("profile");
      const url = new URL(window.location.href);
      url.searchParams.delete("profile");
      window.history.replaceState({}, "", url.toString());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerCategory, setScannerCategory] = useState<string | null>(null);
  const [chatContext, setChatContext] = useState<string | null>(null);
  const [journeyIntent, setJourneyIntent] = useState<"new-trip" | "view" | "appointments" | "new-appointment" | `milestone:${string}` | `phase:${string}` | null>(null);
  const [badges, setBadges] = useState<Partial<Record<Tab, boolean>>>({
    carehub: true,
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem("rufayq_onboarded", "true");
    // Route to role selector first; sign-in follows.
    setAppView(getStoredRole() ? "login" : "role");
  };

  /**
   * Post sign-in role validation.
   * The user picked a role BEFORE login; here we cross-check it against the
   * `user_roles` table. Mismatches sign the user out and bounce them back so
   * the wrong persona can never enter the wrong shell.
   */
  /**
   * Validate a `returnTo` query param so a malicious deep link can't bounce
   * the user out of the patient app shell. Same-origin patient paths only.
   */
  const consumePatientReturnTo = (): boolean => {
    const raw = searchParams.get("returnTo");
    if (!raw) return false;
    if (!raw.startsWith("/")) return false;
    if (raw.startsWith("//")) return false;
    if (!(raw.startsWith("/app") || raw.startsWith("/ar/app"))) return false;
    navigate(raw, { replace: true });
    return true;
  };

  const handleLogin = async () => {
    const stored = getStoredRole();
    const outcome = await validateLoginRole(supabase, stored);

    switch (outcome.kind) {
      case "needs_role":
        setAppView("role");
        return;
      case "guest_doctor_blocked":
        toast.error("Doctor accounts require sign-in", { description: "حسابات الأطباء تتطلب تسجيل الدخول" });
        setAppView("login");
        return;
      case "guest_patient":
        setAppView("main");
        consumePatientReturnTo();
        return;
      case "lookup_error":
        toast.error("Couldn't verify your account role", { description: outcome.message });
        setAppView("login");
        return;
      case "doctor_rejected":
        toast.error("This account is not registered as a doctor", {
          description: "هذا الحساب غير مسجّل كطبيب — الرجاء استخدام حساب طبيب",
        });
        await supabase.auth.signOut();
        clearStoredRole();
        setAppView("role");
        return;
      case "doctor_ok":
        navigate("/provider", { replace: true });
        return;
      case "patient_ok":
        setAppView("main");
        consumePatientReturnTo();
        break;
    }
    registerPush({
      rolePref: stored,
      onDeepLink: routeDeepLink,
    }).catch((e) => console.warn("[push] register skipped", e));
  };

  const handleRolePicked = (role: AppRolePref) => {
    // The actual provider redirect happens AFTER sign-in (see handleLogin).
    // From here we just send the user to the login screen with their pick
    // already persisted via getStoredRole().
    void role;
    setAppView("login");
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


  const handleLogout = async () => {
    try {
      const { biometric } = await import("@/lib/native/biometric");
      await biometric.clear();
    } catch { /* noop */ }
    try { await supabase.auth.signOut(); } catch { /* noop */ }
    try { localStorage.removeItem("rufayq_guest_ok"); } catch { /* noop */ }
    resetFresh();
    localStorage.removeItem("rufayq_onboarded");
    setAppView("onboarding");
  };

  const openScanner = (preselectedCategory?: string) => {
    setScannerCategory(preselectedCategory || null);
    setShowScanner(true);
  };

  const handleScannerSave = useCallback((category: string | null, payload?: { outbound?: any; return?: any; rawOutbound?: any; rawReturn?: any; passenger?: { name?: string; passport?: string } }) => {
    setShowScanner(false);
    const msg = toastMessages[category || "other"] || toastMessages.other;

    // Show toast
    toast.success(msg.en, { description: msg.ar, duration: 4000 });

    // Set badge on Records
    setBadges(prev => ({ ...prev, records: true }));

    // For flight scans, hand off the parsed legs to the Journey screen via a
    // CustomEvent so the timeline + transport list reflect the scan
    // immediately. JourneyScreen subscribes to this event.
    if (category === "flight" && payload && (payload.outbound || payload.return || (Array.isArray((payload as any).legs) && (payload as any).legs.length > 0))) {
      try {
        sessionStorage.setItem("rufayq_pending_flight", JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent("rufayq:pending-flight", { detail: payload }));
      } catch (e) { console.warn("[scanner] could not store pending flight", e); }
    }

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
    } else if (tab === "emr") {
      setAppView("emr");
    } else if (tab === "wallet") {
      const isAr = window.location.pathname.startsWith("/ar");
      navigate(isAr ? "/ar/app/wallet" : "/app/wallet");
    } else if (tab === "chat" && context) {
      setChatContext(context);
      setActiveTab("chat");
      setAppView("main");
    } else if (tab === "journey") {
      const milestoneIntent =
        typeof context === "string" && context.startsWith("milestone:")
          ? (context as `milestone:${string}`)
          : null;
      setJourneyIntent(
        milestoneIntent ??
          (context === "new-trip"
            ? "new-trip"
            : context === "view"
              ? "view"
              : context === "appointments"
                ? "appointments"
                : context === "new-appointment"
                  ? "new-appointment"
                  : null),
      );
      setActiveTab("journey");
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
      case "emr":
        return <EmrScreen onOpenScanner={() => openScanner()} onNavigate={handleNavigate} />;
      case "main":
        switch (activeTab) {
          case "home":
            return <HomeScreen onNavigate={handleNavigate} onProfile={() => setAppView("profile")} isGuest={isGuest} />;
          case "journey": return (
            <JourneyScreen
              onOpenScanner={openScanner}
              onNavigate={handleNavigate}
              initialIntent={journeyIntent}
              onIntentHandled={() => setJourneyIntent(null)}
            />
          );
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