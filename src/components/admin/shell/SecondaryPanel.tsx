import { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { NavGroup, NavLeaf, LeafKey } from "./adminNav";
import type { AdminBadges } from "./useAdminBadges";

interface Props {
  group: NavGroup | undefined;
  activeLeaf: LeafKey;
  onPick: (leaf: LeafKey) => void;
  badges: AdminBadges;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  role: "admin" | "moderator";
}

const SecondaryPanel = ({ group, activeLeaf, onPick, badges, collapsed, onToggleCollapsed, role }: Props) => {
  const [q, setQ] = useState("");

  useEffect(() => { setQ(""); }, [group?.key]);

  const visibleLeaves = useMemo<NavLeaf[]>(() => {
    if (!group) return [];
    const list = group.leaves.filter((l) => role === "admin" || !l.adminOnly);
    if (!q.trim()) return list;
    const term = q.toLowerCase();
    return list.filter((l) => l.label.toLowerCase().includes(term));
  }, [group, q, role]);

  return (
    <aside
      className={`relative border-r border-slate-800 bg-slate-900/40 transition-all duration-300 ease-out flex-shrink-0 ${collapsed ? "w-0" : "w-64"}`}
      aria-label="Module submenu"
    >
      <button
        onClick={onToggleCollapsed}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition"
        aria-label={collapsed ? "Expand submenu" : "Collapse submenu"}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <div className={`overflow-hidden transition-opacity duration-200 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {group && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <group.icon size={14} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-100">{group.label}</h2>
            </div>
            {group.hint && <p className="text-[11px] text-slate-500 mb-3">{group.hint}</p>}

            {group.leaves.length > 2 && (
              <div className="relative mb-3">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter…"
                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md bg-slate-950/50 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            )}

            <ul className="space-y-0.5">
              {visibleLeaves.map((leaf) => {
                const Icon = leaf.icon;
                const active = activeLeaf === leaf.key;
                const badge = leaf.badgeKey ? badges[leaf.badgeKey] : 0;
                return (
                  <li key={leaf.key}>
                    <button
                      onClick={() => onPick(leaf.key)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition group ${
                        active
                          ? "bg-amber-500/10 text-amber-200 border border-amber-500/30"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent"
                      }`}
                    >
                      {Icon && <Icon size={13} className={active ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"} />}
                      <span className="flex-1 text-left truncate">{leaf.label}</span>
                      {badge > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-amber-500 text-slate-950" : "bg-slate-700 text-slate-200"}`}>
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {visibleLeaves.length === 0 && (
                <li className="text-[11px] text-slate-600 px-2 py-3 text-center">No matches</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SecondaryPanel;
