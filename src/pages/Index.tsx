import { useState, useEffect } from "react";
import StatusBar from "@/components/StatusBar";
import BottomNav from "@/components/BottomNav";
import HomeScreen from "@/screens/HomeScreen";
import JourneyScreen from "@/screens/JourneyScreen";
import RecordsScreen from "@/screens/RecordsScreen";
import ChatScreen from "@/screens/ChatScreen";
import MedicationsScreen from "@/screens/MedicationsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import LoginScreen from "@/screens/LoginScreen";

type Tab = "home" | "journey" | "records" | "chat";
type AppView = "onboarding" | "login" | "main" | "medications" | "profile";

const Index = () => {
  const [appView, setAppView] = useState<AppView>(() => {
    const seen = localStorage.getItem("rufayq_onboarded");
    return seen ? "main" : "onboarding";
  });
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const handleOnboardingComplete = () => {
    localStorage.setItem("rufayq_onboarded", "true");
    setAppView("login");
  };

  const handleLogin = () => setAppView("main");
  const handleLogout = () => {
    localStorage.removeItem("rufayq_onboarded");
    setAppView("onboarding");
  };

  const handleNavigate = (tab: string) => {
    if (tab === "medications") {
      setAppView("medications");
    } else {
      setActiveTab(tab as Tab);
      setAppView("main");
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
      case "main":
        switch (activeTab) {
          case "home": return <HomeScreen onNavigate={handleNavigate} onProfile={() => setAppView("profile")} />;
          case "journey": return <JourneyScreen />;
          case "records": return <RecordsScreen />;
          case "chat": return <ChatScreen />;
        }
    }
  };

  const showNav = appView === "main";
  const showStatusBar = appView !== "onboarding";

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1A2A35" }}>
      <div
        className="relative flex flex-col overflow-hidden max-[500px]:!w-full max-[500px]:!h-screen max-[500px]:!rounded-none max-[500px]:!shadow-none"
        style={{
          width: 390,
          height: "min(844px, calc(100vh - 48px))",
          borderRadius: 44,
          background: "#000",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 8px #2A3A45, 0 0 0 10px #1A2A35",
        }}
      >
        {showStatusBar && (
          <div style={{ background: appView === "login" ? "var(--off-white)" : "linear-gradient(135deg, #004D5B, #006D7C)" }}>
            <StatusBar dark={appView === "login"} />
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--off-white)" }}>
          {renderContent()}
        </div>

        {showNav && <BottomNav active={activeTab} onNavigate={setActiveTab} />}
      </div>
    </div>
  );
};

export default Index;
