import { createRoot } from "react-dom/client";
import "./integrations/supabase/deviceHeader";
import App from "./App.tsx";
import "./index.css";
import { registerOfflineSW } from "./lib/registerSW";
import { initSplashHandoff } from "./lib/native/splashHandoff";

createRoot(document.getElementById("root")!).render(<App />);
registerOfflineSW();
// Hide the Capacitor native splash once React is alive. No-op on web.
initSplashHandoff();
