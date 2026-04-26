import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, LogOut, LayoutDashboard, Users, Building2, Activity, CreditCard,
  FileText, MessageSquare, BarChart3, Settings as SettingsIcon, Bell, Search,
  Plus, ChevronLeft, ChevronRight, ChevronDown, Bookmark, Sun, Moon, Globe,
  UserPlus, Star, Briefcase, Inbox, Sparkles, Command,
} from "lucide-react";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";
import AdminPayments from "@/components/admin/AdminPayments";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminTickets from "@/components/admin/AdminTickets";
import AdminPages from "@/components/admin/AdminPages";
import AdminWebsiteCms from "@/components/admin/AdminWebsiteCms";
import AdminNews from "@/components/admin/AdminNews";
import AdminOrganizations from "@/components/admin/AdminOrganizations";
import AdminCreateUser from "@/components/admin/AdminCreateUser";
import AdminAuditLog from "@/components/admin/AdminAuditLog";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminProviderApplications from "@/components/admin/AdminProviderApplications";
import AdminPatientClaims from "@/components/admin/AdminPatientClaims";
import AdminRcmMasters from "@/components/admin/AdminRcmMasters";
import AdminRcmActivations from "@/components/admin/AdminRcmActivations";
import AdminRcmImports from "@/components/admin/AdminRcmImports";
import AdminRcmBulkOps from "@/components/admin/AdminRcmBulkOps";
import AdminVerificationAssist from "@/components/admin/AdminVerificationAssist";
import AdminAiUsage from "@/components/admin/AdminAiUsage";
import AdminUserSearch from "@/components/admin/AdminUserSearch";

// =================================================================
// Information Architecture
// =================================================================
type Role = "admin" | "moderator";

type LeafKey =
  | "dashboard" | "activity" | "kpis" | "quick_actions"
  | "users" | "user_search" | "create" | "verify_assist" | "roles" | "verify_queue" | "bulk_import"
  | "orgs" | "physicians" | "vendors" | "insurance" | "internal_staff" | "contracts" | "applications"
  | "claims" | "rcm" | "rcm_activations" | "rcm_imports" | "rcm_bulk" | "denials" | "payers" | "rcm_reports"
  | "subs" | "payments" | "manual_transfers" | "invoices" | "refunds" | "plans" | "revenue_reports"
  | "website_cms" | "pages" | "landing_sections" | "seo" | "media" | "news" | "blog_categories"
  | "tickets" | "reviews" | "escalations" | "feedback" | "contact_forms"
  | "ai_usage" | "usage_trends" | "funnel" | "customer_health" | "cohorts"
  | "general" | "branding" | "users_access" | "audit" | "api_keys" | "integrations" | "security";

type SubItem = { key: LeafKey; label: string; adminOnly?: boolean; badge?: string; soon?: boolean };
type Group = { id: string; label: string; Icon: any; items: SubItem[] };

const GROUPS: Group[] = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard, items: [
    { key: "dashboard", label: "Dashboard" },
    { key: "activity", label: "Activity Feed", soon: true },
    { key: "kpis", label: "KPIs", soon: true },
    { key: "quick_actions", label: "Quick Actions", soon: true },
  ]},
  { id: "users", label: "Users", Icon: Users, items: [
    { key: "users", label: "All Users" },
    { key: "create", label: "Create User", adminOnly: true },
    { key: "verify_assist", label: "User Activations" },
    { key: "user_search", label: "Search & Assign", adminOnly: true },
    { key: "roles", label: "Roles & Permissions", soon: true },
    { key: "verify_queue", label: "Verification Queue", soon: true },
    { key: "bulk_import", label: "Bulk Import", soon: true },
  ]},
  { id: "orgs", label: "Organizations", Icon: Building2, items: [
    { key: "orgs", label: "Hospitals" },
    { key: "applications", label: "Applications" },
    { key: "physicians", label: "Physicians", soon: true },
    { key: "vendors", label: "Vendors", soon: true },
    { key: "insurance", label: "Insurance", soon: true },
    { key: "internal_staff", label: "Internal Staff", soon: true },
    { key: "contracts", label: "Contracts", soon: true },
  ]},
  { id: "rcm", label: "Revenue Cycle", Icon: Activity, items: [
    { key: "claims", label: "Patient Claims" },
    { key: "rcm", label: "RCM Masters", adminOnly: true },
    { key: "rcm_activations", label: "RCM Activations", adminOnly: true },
    { key: "rcm_imports", label: "RCM Imports", adminOnly: true },
    { key: "rcm_bulk", label: "RCM Bulk Ops", adminOnly: true },
    { key: "denials", label: "Denials", soon: true },
    { key: "payers", label: "Payers", soon: true },
    { key: "rcm_reports", label: "Reports", soon: true },
  ]},
  { id: "billing", label: "Billing & Payments", Icon: CreditCard, items: [
    { key: "subs", label: "Subscriptions", adminOnly: true },
    { key: "payments", label: "Payments", adminOnly: true },
    { key: "manual_transfers", label: "Manual Transfers", soon: true },
    { key: "invoices", label: "Invoices", soon: true },
    { key: "refunds", label: "Refunds", soon: true },
    { key: "plans", label: "Plans", soon: true },
    { key: "revenue_reports", label: "Revenue Reports", soon: true },
  ]},
  { id: "cms", label: "Content CMS", Icon: FileText, items: [
    { key: "website_cms", label: "Website CMS", adminOnly: true },
    { key: "pages", label: "Site Pages (legacy)" },
    { key: "landing_sections", label: "Landing Sections", soon: true },
    { key: "seo", label: "SEO", soon: true },
    { key: "media", label: "Media Library", soon: true },
    { key: "news", label: "News & Articles" },
    { key: "blog_categories", label: "Blog Categories", soon: true },
  ]},
  { id: "support", label: "Support", Icon: MessageSquare, items: [
    { key: "tickets", label: "Tickets" },
    { key: "reviews", label: "Reviews" },
    { key: "escalations", label: "Escalations", soon: true },
    { key: "feedback", label: "Feedback", soon: true },
    { key: "contact_forms", label: "Contact Forms", soon: true },
  ]},
  { id: "analytics", label: "Analytics", Icon: BarChart3, items: [
    { key: "ai_usage", label: "AI Usage", adminOnly: true },
    { key: "usage_trends", label: "Usage Trends", soon: true },
    { key: "funnel", label: "Conversion Funnel", soon: true },
    { key: "customer_health", label: "Customer Health", soon: true },
    { key: "cohorts", label: "Cohorts", soon: true },
  ]},
  { id: "settings", label: "Settings", Icon: SettingsIcon, items: [
    { key: "general", label: "General Settings", soon: true },
    { key: "branding", label: "Branding", soon: true },
    { key: "users_access", label: "Users Access", soon: true },
    { key: "audit", label: "Audit Log" },
    { key: "api_keys", label: "API Keys", soon: true },
    { key: "integrations", label: "Integrations", soon: true },
    { key: "security", label: "Security", soon: true },
  ]},
];

// Map leaf -> render component (only mounted leaves are real screens; others show a polished placeholder)
const LEAF_LABEL: Record<LeafKey, string> = Object.fromEntries(
  GROUPS.flatMap(g => g.items.map(i => [i.key, i.label]))
) as any;

const GROUP_OF: Record<LeafKey, string> = Object.fromEntries(
  GROUPS.flatMap(g => g.items.map(i => [i.key, g.label]))
) as any;

// =================================================================
// Component
// =================================================================
const Admin = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>("overview");
  const [activeLeaf, setActiveLeaf] = useState<LeafKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(true);
  const [submenuQuery, setSubmenuQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [pinned, setPinned] = useState<LeafKey[]>(() => {
    try { return JSON.parse(localStorage.getItem("admin_pins") || "[]"); } catch { return []; }
  });
  const [recents, setRecents] = useState<LeafKey[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">(
    (localStorage.getItem("admin_density") as any) || "comfortable"
  );
  const [theme, setTheme] = useState<"dark" | "light">(
    (localStorage.getItem("admin_theme") as any) || "dark"
  );

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setAuthChecked(true); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const roles = (data || []).map((r: any) => r.role);
      if (roles.includes("admin")) setRole("admin");
      else if (roles.includes("moderator")) setRole("moderator");
      setAuthChecked(true);
    })();
  }, []);

  // Persist prefs
  useEffect(() => { localStorage.setItem("admin_pins", JSON.stringify(pinned)); }, [pinned]);
  useEffect(() => { localStorage.setItem("admin_density", density); }, [density]);
  useEffect(() => { localStorage.setItem("admin_theme", theme); }, [theme]);

  // Track recents
  useEffect(() => {
    setRecents(prev => [activeLeaf, ...prev.filter(l => l !== activeLeaf)].slice(0, 5));
  }, [activeLeaf]);

  // Keyboard shortcuts
  useEffect(() => {
    let buffer: string[] = [];
    let timer: any;
    const map: Record<string, LeafKey> = {
      "g u": "users", "g p": "payments", "g t": "tickets",
      "g d": "dashboard", "g c": "claims", "g s": "subs", "g w": "website_cms",
    };
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        document.getElementById("admin-global-search")?.focus();
        return;
      }
      if (e.key.length === 1) {
        buffer.push(e.key.toLowerCase());
        if (buffer.length > 2) buffer = buffer.slice(-2);
        const key = buffer.join(" ");
        if (map[key]) {
          const leaf = map[key];
          const grp = GROUPS.find(g => g.items.some(i => i.key === leaf));
          if (grp) { setActiveGroup(grp.id); setActiveLeaf(leaf); }
          buffer = [];
        }
        clearTimeout(timer);
        timer = setTimeout(() => { buffer = []; }, 800);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const signOut = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.rpc("log_audit_event", { _action: "staff_signed_out", _target_type: "auth", _target_id: user.id, _details: { email: user.email } });
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const togglePin = useCallback((leaf: LeafKey) => {
    setPinned(prev => prev.includes(leaf) ? prev.filter(p => p !== leaf) : [...prev, leaf].slice(0, 8));
  }, []);

  const goToLeaf = (leaf: LeafKey) => {
    const grp = GROUPS.find(g => g.items.some(i => i.key === leaf));
    if (grp) { setActiveGroup(grp.id); setActiveLeaf(leaf); }
  };

  const currentGroup = GROUPS.find(g => g.id === activeGroup) || GROUPS[0];
  const visibleSubItems = useMemo(() => currentGroup.items.filter(i => {
    if (i.adminOnly && role !== "admin") return false;
    if (submenuQuery && !i.label.toLowerCase().includes(submenuQuery.toLowerCase())) return false;
    return true;
  }), [currentGroup, role, submenuQuery]);

  const globalResults = useMemo(() => {
    if (!globalQuery.trim()) return [];
    const q = globalQuery.toLowerCase();
    return GROUPS.flatMap(g => g.items
      .filter(i => (!i.adminOnly || role === "admin") && (i.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)))
      .map(i => ({ ...i, group: g.label, groupId: g.id }))
    ).slice(0, 8);
  }, [globalQuery, role]);

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A] text-slate-300">Loading…</div>;
  }
  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D1B2A] text-slate-300 px-6 text-center">
        <Shield size={42} className="mb-4 text-amber-400" />
        <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Staff sign-in required</h1>
        <p className="text-sm text-slate-400 mb-6">Sign in with your staff email and password to access the admin portal.</p>
        <div className="flex gap-3">
          <Link to="/admin/login" className="px-5 py-2.5 rounded-full bg-amber-500 text-slate-950 text-sm font-semibold">Sign in</Link>
          <Link to="/" className="px-5 py-2.5 rounded-full border border-slate-700 text-slate-300 text-sm font-semibold">Back to site</Link>
        </div>
      </div>
    );
  }

  const renderLeaf = () => {
    switch (activeLeaf) {
      case "dashboard": return <AdminDashboard />;
      case "users": return <AdminUsers />;
      case "user_search": return role === "admin" ? <AdminUserSearch /> : null;
      case "create": return role === "admin" ? <AdminCreateUser /> : null;
      case "verify_assist": return <AdminVerificationAssist />;
      case "orgs": return <AdminOrganizations />;
      case "applications": return <AdminProviderApplications />;
      case "claims": return <AdminPatientClaims />;
      case "rcm": return role === "admin" ? <AdminRcmMasters /> : null;
      case "rcm_activations": return role === "admin" ? <AdminRcmActivations /> : null;
      case "rcm_imports": return role === "admin" ? <AdminRcmImports /> : null;
      case "rcm_bulk": return role === "admin" ? <AdminRcmBulkOps /> : null;
      case "subs": return role === "admin" ? <AdminSubscriptions /> : null;
      case "payments": return role === "admin" ? <AdminPayments /> : null;
      case "ai_usage": return role === "admin" ? <AdminAiUsage /> : null;
      case "reviews": return <AdminReviews />;
      case "tickets": return <AdminTickets />;
      case "news": return <AdminNews />;
      case "pages": return <AdminPages />;
      case "website_cms": return role === "admin" ? <AdminWebsiteCms /> : null;
      case "audit": return <AdminAuditLog />;
      default: return <ComingSoon label={LEAF_LABEL[activeLeaf]} group={GROUP_OF[activeLeaf]} />;
    }
  };

  const sidebarWidth = collapsed ? 76 : 240;
  const submenuWidth = submenuOpen ? 280 : 0;

  return (
    <div
      className="min-h-screen flex text-slate-100"
      style={{
        fontFamily: "'DM Sans', system-ui, -apple-system, Segoe UI, Roboto",
        background: theme === "dark" ? "#0A1420" : "#F8FAFC",
        color: theme === "dark" ? "#E2E8F0" : "#0D1B2A",
      }}
    >
      {/* ============ COLUMN 1 — PRIMARY SIDEBAR ============ */}
      <aside
        className="flex flex-col border-r shrink-0 transition-all duration-300"
        style={{
          width: sidebarWidth,
          background: "#0D1B2A",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        {/* Brand */}
        <div className="px-4 py-5 flex items-center gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: "linear-gradient(135deg,#006D7C,#004D5B)", boxShadow: "0 6px 20px rgba(0,109,124,0.35)" }}>
            <Shield size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, lineHeight: 1 }}>
                RufayQ
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(197,150,90,0.15)", color: "#C5965A" }}>
                  {role}
                </span>
                <span className="text-[10px] text-slate-400">Admin</span>
              </div>
            </div>
          )}
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {GROUPS.map(g => {
            const active = g.id === activeGroup;
            const Icon = g.Icon;
            return (
              <button
                key={g.id}
                onClick={() => { setActiveGroup(g.id); setSubmenuOpen(true); const first = g.items.find(i => !i.adminOnly || role === "admin"); if (first) setActiveLeaf(first.key); }}
                title={collapsed ? g.label : undefined}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
                  active ? "text-white" : "text-slate-400 hover:text-white"
                }`}
                style={active ? { background: "linear-gradient(90deg, rgba(0,109,124,0.25), rgba(0,77,91,0.05))" } : {}}
              >
                {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full" style={{ background: "#C5965A" }} />}
                <Icon size={18} className="shrink-0" style={{ color: active ? "#C5965A" : undefined }} />
                {!collapsed && <span className="font-medium truncate">{g.label}</span>}
              </button>
            );
          })}

          {!collapsed && pinned.length > 0 && (
            <div className="pt-4 mt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="px-3 text-[10px] uppercase tracking-wider text-slate-500 mb-2">Pinned</div>
              {pinned.map(p => (
                <button key={p} onClick={() => goToLeaf(p)}
                  className="w-full text-left px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-white hover:bg-white/5 truncate">
                  ★ {LEAF_LABEL[p]}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom */}
        <div className="border-t px-2 py-3 space-y-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button onClick={() => setNotifOpen(v => !v)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 relative">
            <Bell size={16} />
            {!collapsed && <span>Notifications</span>}
            <span className="absolute top-1.5 left-6 w-1.5 h-1.5 rounded-full bg-red-500" />
          </button>
          <button onClick={() => setProfileOpen(v => !v)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                 style={{ background: "linear-gradient(135deg,#C5965A,#8b6f3e)", color: "#0D1B2A" }}>
              {role?.[0]?.toUpperCase()}
            </div>
            {!collapsed && <span className="truncate">Profile</span>}
          </button>
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-300 hover:bg-red-500/5">
            <LogOut size={16} />
            {!collapsed && <span>Sign out</span>}
          </button>
          <button onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center gap-2 mt-1 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-white/5">
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* ============ COLUMN 2 — CONTEXTUAL SUBMENU ============ */}
      <aside
        className="flex flex-col border-r shrink-0 transition-all duration-300 overflow-hidden"
        style={{
          width: submenuWidth,
          background: "#111827",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {submenuOpen && (
          <>
            <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-white truncate" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22 }}>
                  {currentGroup.label}
                </h2>
                <button onClick={() => setSubmenuOpen(false)} className="text-slate-500 hover:text-white p-1 rounded">
                  <ChevronLeft size={14} />
                </button>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={submenuQuery}
                  onChange={e => setSubmenuQuery(e.target.value)}
                  placeholder="Search modules…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/30 border text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#006D7C]"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-2">
              {visibleSubItems.length === 0 && (
                <div className="px-4 py-6 text-xs text-slate-500 text-center">No matches.</div>
              )}
              {visibleSubItems.map(item => {
                const active = item.key === activeLeaf;
                const isPinned = pinned.includes(item.key);
                return (
                  <div key={item.key}
                    className={`group flex items-center gap-2 px-3 ${density === "compact" ? "py-1.5" : "py-2.5"} rounded-md text-sm cursor-pointer transition-all ${
                      active ? "bg-white/[0.06] text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                    }`}
                    onClick={() => setActiveLeaf(item.key)}
                  >
                    {active && <span className="w-1 h-4 rounded-full" style={{ background: "#C5965A" }} />}
                    <span className={`flex-1 truncate ${active ? "font-medium" : ""}`}>{item.label}</span>
                    {item.soon && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">Soon</span>}
                    {item.adminOnly && <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded text-amber-400/70">Adm</span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(item.key); }}
                      className={`p-0.5 rounded ${isPinned ? "text-amber-400 opacity-100" : "opacity-0 group-hover:opacity-60 hover:opacity-100 text-slate-400"}`}
                      title={isPinned ? "Unpin" : "Pin to sidebar"}
                    >
                      <Bookmark size={12} fill={isPinned ? "#C5965A" : "none"} />
                    </button>
                  </div>
                );
              })}

              {recents.length > 1 && !submenuQuery && (
                <div className="pt-4 mt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="px-3 text-[10px] uppercase tracking-wider text-slate-500 mb-1">Recent</div>
                  {recents.slice(1, 5).map(r => (
                    <button key={r} onClick={() => goToLeaf(r)}
                      className="w-full text-left px-3 py-1.5 rounded-md text-xs text-slate-500 hover:text-white hover:bg-white/[0.03] truncate">
                      {LEAF_LABEL[r]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Density toggle */}
            <div className="border-t px-3 py-2.5 flex items-center justify-between text-[10px]" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="text-slate-500 uppercase tracking-wider">Density</span>
              <div className="flex bg-black/30 rounded-md p-0.5">
                {(["comfortable","compact"] as const).map(d => (
                  <button key={d} onClick={() => setDensity(d)}
                    className={`px-2 py-0.5 rounded text-[10px] capitalize ${density === d ? "bg-[#006D7C] text-white" : "text-slate-500"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Submenu re-open tab */}
      {!submenuOpen && (
        <button onClick={() => setSubmenuOpen(true)}
          className="w-6 shrink-0 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 border-r"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0D1B2A" }}>
          <ChevronRight size={14} />
        </button>
      )}

      {/* ============ COLUMN 3 — CONTENT ============ */}
      <main className="flex-1 flex flex-col min-w-0" style={{ background: theme === "dark" ? "#0A1420" : "#F8FAFC" }}>
        {/* Sticky topbar */}
        <header className="sticky top-0 z-20 border-b backdrop-blur-xl"
          style={{
            background: theme === "dark" ? "rgba(13,27,42,0.85)" : "rgba(255,255,255,0.9)",
            borderColor: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(13,27,42,0.08)",
          }}
        >
          <div className="px-6 py-3 flex items-center gap-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs shrink-0">
              <span className="text-slate-500">{currentGroup.label}</span>
              <ChevronRight size={12} className="text-slate-600" />
              <span className="font-medium" style={{ color: theme === "dark" ? "#fff" : "#0D1B2A" }}>{LEAF_LABEL[activeLeaf]}</span>
            </div>

            {/* Global search */}
            <div className="flex-1 max-w-xl mx-auto relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="admin-global-search"
                value={globalQuery}
                onChange={e => setGlobalQuery(e.target.value)}
                placeholder="Search users, claims, payments, pages…"
                className="w-full pl-10 pr-16 py-2 rounded-lg border text-sm focus:outline-none transition-colors"
                style={{
                  background: theme === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
                  borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(13,27,42,0.1)",
                  color: theme === "dark" ? "#E2E8F0" : "#0D1B2A",
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 flex items-center gap-1 px-1.5 py-0.5 rounded border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <Command size={10} /> K
              </span>

              {globalResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-2xl overflow-hidden z-30"
                  style={{ background: "#111827", borderColor: "rgba(255,255,255,0.08)" }}>
                  {globalResults.map(r => (
                    <button key={r.key} onClick={() => { goToLeaf(r.key); setGlobalQuery(""); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 flex items-center justify-between border-b last:border-b-0"
                      style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center gap-3">
                        <Sparkles size={12} className="text-amber-400" />
                        <span>{r.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{r.group}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Quick create */}
              <div className="relative">
                <button onClick={() => setQuickOpen(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#006D7C,#004D5B)", boxShadow: "0 4px 14px rgba(0,109,124,0.4)" }}>
                  <Plus size={13} /> New
                  <ChevronDown size={11} />
                </button>
                {quickOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-48 rounded-xl border shadow-2xl overflow-hidden z-30"
                    style={{ background: "#111827", borderColor: "rgba(255,255,255,0.08)" }}>
                    {[
                      { l: "User", k: "create" as LeafKey, I: UserPlus },
                      { l: "Ticket", k: "tickets" as LeafKey, I: MessageSquare },
                      { l: "Article", k: "news" as LeafKey, I: FileText },
                      { l: "Payment", k: "payments" as LeafKey, I: CreditCard },
                      { l: "Claim", k: "claims" as LeafKey, I: Briefcase },
                      { l: "Subscription", k: "subs" as LeafKey, I: Star },
                    ].map(o => (
                      <button key={o.l} onClick={() => { goToLeaf(o.k); setQuickOpen(false); }}
                        className="w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 flex items-center gap-3 text-left">
                        <o.I size={14} className="text-slate-400" /> {o.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <IconBtn theme={theme} onClick={() => setNotifOpen(v => !v)} title="Notifications">
                <Bell size={15} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
              </IconBtn>
              <IconBtn theme={theme} title="Tasks"><Inbox size={15} /></IconBtn>
              <IconBtn theme={theme} onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title="Theme">
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </IconBtn>
              <IconBtn theme={theme} title="Language">
                <Globe size={15} />
              </IconBtn>
              <button onClick={() => setProfileOpen(v => !v)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ml-1"
                style={{ background: "linear-gradient(135deg,#C5965A,#8b6f3e)", color: "#0D1B2A" }}>
                {role?.[0]?.toUpperCase()}
              </button>
            </div>
          </div>
        </header>

        {/* Page workspace */}
        <div className={`flex-1 overflow-y-auto ${density === "compact" ? "p-4" : "p-6 lg:p-8"}`}>
          <div className="max-w-[1600px] mx-auto animate-fade-in">
            {renderLeaf()}
          </div>
        </div>
      </main>
    </div>
  );
};

// =================================================================
// Helpers
// =================================================================
const IconBtn = ({ children, onClick, title, theme }: { children: React.ReactNode; onClick?: () => void; title?: string; theme: "dark"|"light" }) => (
  <button onClick={onClick} title={title}
    className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
    style={{
      color: theme === "dark" ? "#94A3B8" : "#475569",
      background: "transparent",
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(13,27,42,0.05)"; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
  >
    {children}
  </button>
);

const ComingSoon = ({ label, group }: { label: string; group: string }) => (
  <div className="rounded-2xl border p-12 text-center"
    style={{ background: "linear-gradient(135deg, rgba(0,109,124,0.05), rgba(197,150,90,0.03))", borderColor: "rgba(255,255,255,0.06)" }}>
    <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5"
      style={{ background: "linear-gradient(135deg,#006D7C,#004D5B)", boxShadow: "0 8px 28px rgba(0,109,124,0.4)" }}>
      <Sparkles size={22} className="text-white" />
    </div>
    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">{group}</div>
    <h2 className="text-3xl font-light mb-3 text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{label}</h2>
    <p className="text-sm text-slate-400 max-w-md mx-auto">
      This module is part of the next admin release. The information architecture is wired and the page is reserved — implementation is queued in the roadmap.
    </p>
    <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
      style={{ background: "rgba(197,150,90,0.1)", color: "#C5965A" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#C5965A] animate-pulse" /> In roadmap
    </div>
  </div>
);

export default Admin;
