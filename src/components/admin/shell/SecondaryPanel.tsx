import { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import type { NavGroup, NavLeaf, LeafKey } from "./adminNav";
import type { AdminBadges } from "./useAdminBadges";

interface Props {
  group: NavGroup | undefined;
  activeLeaf: LeafKey;
  onPick: (leaf: LeafKey) => void;
  badges: AdminBadges;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  role: "admin" | "moderator" | "qc_tester";
}

const PILL_STYLES: Record<string, string> = {
  new:  "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  beta: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
  live: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
};

const SecondaryPanel = ({ group, activeLeaf, onPick, badges, collapsed, onToggleCollapsed, role }: Props) => {
  const [q, setQ] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => { setQ(""); }, [group?.key]);

  // When the group changes, ensure the section containing the active leaf is open by default.
  useEffect(() => {
    if (!group) return;
    const next: Record<string, boolean> = {};
    (group.sections ?? []).forEach((s) => { next[s] = true; });
    setOpenSections(next);
  }, [group?.key]);

  const visibleLeaves = useMemo<NavLeaf[]>(() => {
    if (!group) return [];
    const list = group.leaves.filter((l) => role === "admin" || !l.adminOnly);
    if (!q.trim()) return list;
    const term = q.toLowerCase();
    return list.filter((l) => l.label.toLowerCase().includes(term));
  }, [group, q, role]);

  // Group leaves by section name (or "_default" for ungrouped).
  const grouped = useMemo(() => {
    const map = new Map<string, NavLeaf[]>();
    visibleLeaves.forEach((l) => {
      const key = l.section || "_default";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return map;
  }, [visibleLeaves]);

  const sectionOrder = useMemo(() => {
    if (!group) return [];
    const arr: string[] = [];
    (group.sections ?? []).forEach((s) => { if (grouped.has(s)) arr.push(s); });
    if (grouped.has("_default")) arr.push("_default");
    // Any section not declared up-front
    grouped.forEach((_, k) => { if (!arr.includes(k)) arr.push(k); });
    return arr;
  }, [group, grouped]);

  const renderLeaf = (leaf: NavLeaf) => {
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
          {leaf.pillTone && (
            <span className={`text-[9px] font-bold uppercase tracking-wide rounded px-1 py-0.5 ${PILL_STYLES[leaf.pillTone]}`}>
              {leaf.pillTone}
            </span>
          )}
          {badge > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-amber-500 text-slate-950" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`}>
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <div className="relative flex-shrink-0 flex">
      <aside
        className={`relative border-r border-slate-800 bg-slate-900/40 transition-[width] duration-300 ease-out overflow-hidden ${collapsed ? "w-0 border-r-0" : "w-64"}`}
        aria-label="Module submenu"
        aria-hidden={collapsed}
      >
        <div className={`w-64 transition-opacity duration-200 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
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

            {sectionOrder.map((sec) => {
              const items = grouped.get(sec) || [];
              if (items.length === 0) return null;
              if (sec === "_default") {
                return <ul key="_default" className="space-y-0.5">{items.map(renderLeaf)}</ul>;
              }
              const open = openSections[sec] !== false;
              return (
                <div key={sec} className="mb-2">
                  <button
                    onClick={() => setOpenSections((s) => ({ ...s, [sec]: !open }))}
                    className="w-full flex items-center justify-between px-1 py-1 text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition"
                  >
                    <span>{sec}</span>
                    <ChevronDown size={10} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
                  </button>
                  <div className={`grid transition-all duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <ul className="space-y-0.5 overflow-hidden">{items.map(renderLeaf)}</ul>
                  </div>
                </div>
              );
            })}
            {visibleLeaves.length === 0 && (
              <p className="text-[11px] text-slate-600 px-2 py-3 text-center">No matches</p>
            )}
          </div>
        )}
        </div>
      </aside>
      <button
        onClick={onToggleCollapsed}
        className="absolute top-6 z-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-700"
        style={{ left: collapsed ? "-12px" : "calc(16rem - 12px)", transition: "left 300ms ease-out" }}
        aria-label={collapsed ? "Expand submenu" : "Collapse submenu"}
        title={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </div>
  );
};

export default SecondaryPanel;
