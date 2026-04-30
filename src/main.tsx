import { createRoot } from "react-dom/client";
import "./integrations/supabase/deviceHeader";
import App from "./App.tsx";
import "./index.css";
import { registerOfflineSW } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(<App />);
registerOfflineSW();
