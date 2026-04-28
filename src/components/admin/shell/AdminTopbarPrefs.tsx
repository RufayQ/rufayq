import { Sun, Moon, Type } from "lucide-react";
import { useAdminPrefs, type AdminFontScale } from "@/hooks/useAdminPrefs";

/** Topbar controls for theme + font scale. Pure UI. */
const AdminTopbarPrefs = () => {
  const { theme, toggleTheme, fontScale, setFontScale } = useAdminPrefs();
  const sizes: { k: AdminFontScale; label: string }[] = [
    { k: "sm", label: "A−" },
    { k: "md", label: "A" },
    { k: "lg", label: "A+" },
  ];

  return (
    <div className="flex items-center gap-1">
      <div className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/70 overflow-hidden" role="group" aria-label="Font size">
        <Type size={11} className="ml-2 text-slate-500" />
        {sizes.map((s) => (
          <button
            key={s.k}
            onClick={() => setFontScale(s.k)}
            aria-pressed={fontScale === s.k}
            title={`Font size ${s.label}`}
            className={`px-2 py-1 text-[11px] font-semibold transition ${
              fontScale === s.k ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button
        onClick={toggleTheme}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        aria-label="Toggle theme"
        className="w-8 h-8 rounded-md bg-slate-800/70 border border-slate-700 text-slate-400 hover:text-amber-300 flex items-center justify-center transition"
      >
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
};

export default AdminTopbarPrefs;
