import { useEffect, useRef, useState } from "react";
import { Plus, UserPlus, MessageSquare, FileText, CreditCard, Briefcase, Sparkles } from "lucide-react";
import type { LeafKey } from "./adminNav";

interface Item {
  label: string;
  hint: string;
  icon: typeof Plus;
  go: { leaf: LeafKey; action?: string };
  shortcut?: string;
}

const ITEMS: Item[] = [
  { label: "New User",         hint: "Create a patient or staff account", icon: UserPlus,      go: { leaf: "create", action: "new" }, shortcut: "U" },
  { label: "New Ticket",       hint: "Open a customer support ticket",    icon: MessageSquare, go: { leaf: "tickets", action: "new" }, shortcut: "T" },
  { label: "New Article",      hint: "Publish a news article or guide",   icon: FileText,      go: { leaf: "news", action: "new" }, shortcut: "A" },
  { label: "New Payment",      hint: "Log a manual payment receipt",      icon: CreditCard,    go: { leaf: "payments", action: "new" }, shortcut: "P" },
  { label: "New Claim",        hint: "Start a patient insurance claim",   icon: Briefcase,     go: { leaf: "claims", action: "new" }, shortcut: "C" },
  { label: "New Subscription", hint: "Assign a plan to an existing user", icon: Sparkles,      go: { leaf: "user_search", action: "assign" }, shortcut: "S" },
];

interface Props {
  onPick: (leaf: LeafKey, action?: string) => void;
}

const QuickCreateMenu = ({ onPick }: Props) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onClick); window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500 text-slate-950 hover:brightness-110 transition"
      >
        <Plus size={14} /> New
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1"
          role="menu"
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">Quick create</div>
          <ul className="py-1">
            {ITEMS.map((it) => {
              const Icon = it.icon;
              return (
                <li key={it.label}>
                  <button
                    onClick={() => { setOpen(false); onPick(it.go.leaf, it.go.action); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800/70 transition"
                    role="menuitem"
                  >
                    <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <Icon size={14} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-slate-100 truncate">{it.label}</span>
                      <span className="block text-[11px] text-slate-500 truncate">{it.hint}</span>
                    </span>
                    {it.shortcut && (
                      <kbd className="text-[10px] font-mono text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">⇧ {it.shortcut}</kbd>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QuickCreateMenu;
