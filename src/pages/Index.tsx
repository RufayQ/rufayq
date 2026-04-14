import { useState, useCallback } from "react";
import { toast } from "sonner";
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

type Tab = "home" | "journey" | "records" | "carehub" | "chat";
type AppView = "onboarding" | "login" | "main" | "medications" | "profile" | "settings" | "pricing";

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

  const [appView, setAppView] = useState<AppView>(() => {
    const seen = localStorage.getItem("rufayq_onboarded");
    return seen ? "main" : "onboarding";
  });
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerCategory, setScannerCategory] = useState<string | null>(null);
  const [badges, setBadges] = useState<Partial<Record<Tab, boolean>>>({
    carehub: true,
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem("rufayq_onboarded", "true");
    setAppView("login");
  };

  const handleLogin = () => setAppView("main");
  const handleLogout = () => {
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

  const handleNavigate = (tab: string) => {
    if (tab === "medications") {
      setAppView("medications");
    } else if (tab === "scanner") {
      openScanner();
    } else if (tab === "settings") {
      setAppView("settings");
    } else if (tab === "pricing") {
      setAppView("pricing");
    } else {
      setActiveTab(tab as Tab);
      setAppView("main");
    }
  };

  const handleTabNavigate = (tab: Tab) => {
    setActiveTab(tab);
    // Clear badge when visiting tab
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
      case "medications":
        return <MedicationsScreen onBack={() => setAppView("main")} />;
      case "profile":
        return <ProfileScreen onBack={() => setAppView("main")} onLogout={handleLogout} />;
      case "settings":
        return <SettingsScreen onBack={() => { refreshTheme(); setAppView("main"); }} />;
      case "pricing":
        return <PricingScreen onBack={() => setAppView("main")} />;
      case "main":
        switch (activeTab) {
          case "home": return <HomeScreen onNavigate={handleNavigate} onProfile={() => setAppView("profile")} />;
          case "journey": return <JourneyScreen onOpenScanner={openScanner} />;
          case "records": return <RecordsScreen onOpenScanner={() => openScanner()} onNavigate={handleNavigate} />;
          case "carehub": return <CareHubScreen />;
          case "chat": return <ChatScreen onOpenScanner={() => openScanner()} />;
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
            <StatusBar dark={appView === "login"} />
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--off-white)" }}>
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
      </div>
    </div>
  );
};

export default Index;