import { useEffect } from "react";
import { LogOut, X } from "lucide-react";
import ConnectedAccountsCard from "@/components/profile/ConnectedAccountsCard";

type Props = {
  open: boolean;
  onClose: () => void;
  email: string;
  organisation?: string;
  onSignOut: () => void;
};

const PANEL_BG = "#F7F4EE";
const NAVY = "#0A2540";
const GOLD = "#C5965A";
const BORDER = "rgba(10,37,64,0.1)";

const ProviderAccountPanel = ({ open, onClose, email, organisation, onSignOut }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(6,16,26,0.55)" }}
        onClick={onClose}
      />
      <aside
        className="absolute top-0 right-0 h-full w-full max-w-[420px] flex flex-col"
        style={{
          background: PANEL_BG,
          // Reset the design tokens used by ConnectedAccountsCard so it renders correctly inside the dark provider shell.
          // @ts-expect-error CSS custom props
          "--white": "#FFFFFF",
          "--navy": NAVY,
          "--gold": GOLD,
          "--gray": "#5C6B7A",
          "--gray-light": BORDER,
          "--teal-deep": "#0E7C7B",
          "--teal-light": "rgba(14,124,123,0.12)",
          "--error": "#C0392B",
        }}
      >
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${BORDER}`, fontFamily: "'DM Sans', system-ui" }}
        >
          <div>
            <p className="text-[11px] font-mono tracking-widest" style={{ color: GOLD }}>
              MY ACCOUNT
            </p>
            <p className="text-[15px] font-semibold mt-0.5" style={{ color: NAVY }}>
              {email}
            </p>
            {organisation && (
              <p className="text-[12px]" style={{ color: "#5C6B7A" }}>
                {organisation}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <X size={18} style={{ color: NAVY }} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto py-2" style={{ fontFamily: "'DM Sans', system-ui" }}>
          <ConnectedAccountsCard />
        </div>

        <footer className="px-5 py-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button
            onClick={onSignOut}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold"
            style={{ background: "rgba(192,57,43,0.1)", color: "#C0392B", border: "1px solid rgba(192,57,43,0.3)" }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </footer>
      </aside>
    </div>
  );
};

export default ProviderAccountPanel;
