import { createRoot } from "react-dom/client";
import "./integrations/supabase/deviceHeader";
import App from "./App.tsx";
import "./index.css";
import { registerOfflineSW } from "./lib/registerSW";
import { initSplashHandoff } from "./lib/native/splashHandoff";

console.info("[RufayqStartup] main.tsx render start");
createRoot(document.getElementById("root")!).render(<App />);
console.info("[RufayqStartup] React mounted");
registerOfflineSW();
// Hide the Capacitor native splash once React is alive. No-op on web.
initSplashHandoff();
