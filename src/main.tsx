import { createRoot } from "react-dom/client";
import "./integrations/supabase/deviceHeader";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
