import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, Sparkles, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import ConnectedAccountsCard from "@/components/profile/ConnectedAccountsCard";

interface Prefs {
  density: "comfortable" | "compact";
  showCounts: boolean;
  defaultLanding: string;
}

const LS = "admin.settings.general";
const DEFAULTS: Prefs = { density: "comfortable", showCounts: true, defaultLanding: "dashboard" };

const AdminSettingsGeneral = () => {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch { /* noop */ }
  }, []);

  const update = <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const save = () => {
    try {
      localStorage.setItem(LS, JSON.stringify(prefs));
      setDirty(false);
      toast.success("Workspace settings saved");
    } catch {
      toast.error("Could not save settings");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <SettingsIcon size={18} className="text-amber-400" />
        <h2 className="text-xl font-semibold text-slate-100">General</h2>
      </div>
      <p className="text-xs text-slate-500 mb-6">Workspace defaults for your admin sessions. Stored on this device.</p>

      <div className="space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-sm font-medium text-slate-100 mb-1">Table density</p>
          <p className="text-[11px] text-slate-500 mb-3">Affects new table primitives across the portal.</p>
          <div className="flex gap-2">
            {(["comfortable", "compact"] as const).map((d) => (
              <button
                key={d}
                onClick={() => update("density", d)}
                className={`px-3 py-1.5 text-xs rounded-md border transition ${
                  prefs.density === d
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                    : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                {d === "comfortable" ? "Comfortable" : "Compact"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-100 mb-1">Show queue counts on sidebar</p>
            <p className="text-[11px] text-slate-500">Numeric badges next to modules with pending items.</p>
          </div>
          <button
            onClick={() => update("showCounts", !prefs.showCounts)}
            className={`relative w-10 h-6 rounded-full transition ${prefs.showCounts ? "bg-amber-500" : "bg-slate-700"}`}
            aria-label="Toggle queue counts"
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${prefs.showCounts ? "translate-x-[18px]" : "translate-x-0.5"}`} />
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-sm font-medium text-slate-100 mb-1">Default landing screen</p>
          <p className="text-[11px] text-slate-500 mb-3">Where the portal opens after sign-in.</p>
          <select
            value={prefs.defaultLanding}
            onChange={(e) => update("defaultLanding", e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-md bg-slate-950/50 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/40"
          >
            <option value="dashboard">Command Center (Dashboard)</option>
            <option value="users">Users</option>
            <option value="claims">Patient Claims</option>
            <option value="payments">Payments & Receipts</option>
            <option value="tickets">Tickets</option>
          </select>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <Sparkles size={14} className="text-amber-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium text-amber-200 mb-0.5">Phase-2 settings</p>
            <p className="text-[11px] text-amber-100/70">
              SSO, branding, feature flags, and bilingual locale defaults will land in the next round.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={save}
            disabled={!dirty}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition ${
              dirty
                ? "bg-amber-500 text-slate-950 hover:brightness-110"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Save size={12} /> Save changes
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-1">
          <UserCircle2 size={16} className="text-amber-400" />
          <h3 className="text-base font-semibold text-slate-100">My account</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">Manage the sign-in methods linked to your admin account.</p>
        <div
          className="rounded-xl"
          style={{
            background: "#F7F4EE",
            // Reset semantic tokens so the card renders correctly inside the dark admin shell.
            // @ts-expect-error CSS custom props
            "--white": "#FFFFFF",
            "--navy": "#0A2540",
            "--gold": "#C5965A",
            "--gray": "#5C6B7A",
            "--gray-light": "rgba(10,37,64,0.1)",
            "--teal-deep": "#0E7C7B",
            "--teal-light": "rgba(14,124,123,0.12)",
            "--error": "#C0392B",
          } as React.CSSProperties}
        >
          <div className="py-2" style={{ fontFamily: "'DM Sans', system-ui" }}>
            <ConnectedAccountsCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsGeneral;
