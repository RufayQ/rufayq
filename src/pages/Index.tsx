import { useState } from "react";
import StatusBar from "@/components/StatusBar";
import BottomNav from "@/components/BottomNav";
import HomeScreen from "@/screens/HomeScreen";
import JourneyScreen from "@/screens/JourneyScreen";
import RecordsScreen from "@/screens/RecordsScreen";
import ChatScreen from "@/screens/ChatScreen";

type Tab = "home" | "journey" | "records" | "chat";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const renderScreen = () => {
    switch (activeTab) {
      case "home": return <HomeScreen onNavigate={(t) => setActiveTab(t as Tab)} />;
      case "journey": return <JourneyScreen />;
      case "records": return <RecordsScreen />;
      case "chat": return <ChatScreen />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a2e" }}>
      {/* Phone Frame */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: 385,
          height: 780,
          borderRadius: 42,
          background: "#000",
          boxShadow: "0 0 0 2px #333, 0 20px 60px rgba(0,0,0,0.5), 0 0 0 12px #1a1a1a",
        }}
      >
        {/* Status Bar */}
        <div style={{ background: "linear-gradient(135deg, #004D5B, #006D7C)" }}>
          <StatusBar />
        </div>

        {/* Screen Content */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--off-white)" }}>
          {renderScreen()}
        </div>

        {/* Bottom Nav */}
        <BottomNav active={activeTab} onNavigate={setActiveTab} />
      </div>
    </div>
  );
};

export default Index;
