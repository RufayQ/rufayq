import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LogOut, Search, ChevronRight, Home, Menu, X } from "lucide-react";

import AdminUsers from "@/components/admin/AdminUsers";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";
import AdminPayments from "@/features/payments/admin/ui/AdminPayments";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminTickets from "@/components/admin/AdminTickets";
import AdminPages from "@/components/admin/AdminPages";
import AdminWebsiteCms from "@/components/admin/AdminWebsiteCms";
import AdminNews from "@/components/admin/AdminNews";
import AdminOrganizations from "@/components/admin/AdminOrganizations";
import AdminCreateUser from "@/components/admin/AdminCreateUser";
import AdminCustomerService from "@/components/admin/AdminCustomerService";
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
import AdminSettingsGeneral from "@/components/admin/AdminSettingsGeneral";
import AdminSettingsTeam from "@/components/admin/AdminSettingsTeam";
import ComingSoon from "@/components/admin/shell/ComingSoon";
import AdminCmsSeo from "@/components/admin/AdminCmsSeo";
import AdminCmsMedia from "@/components/admin/AdminCmsMedia";
import AdminCmsBlogCategories from "@/components/admin/AdminCmsBlogCategories";

import { NAV_MODULES, ALL_LEAVES, findGroupForLeaf, type LeafKey } from "@/components/admin/shell/adminNav";
import { useAdminBadges } from "@/components/admin/shell/useAdminBadges";
import SecondaryPanel from "@/components/admin/shell/SecondaryPanel";
import QuickCreateMenu from "@/components/admin/shell/QuickCreateMenu";
import GlobalSearchPalette from "@/components/admin/shell/GlobalSearchPalette";
import AdminTopbarPrefs from "@/components/admin/shell/AdminTopbarPrefs";

const LS_LEAF = "admin.leaf";
const LS_COLLAPSED = "admin.submenu.collapsed";

const Admin = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState<"admin" | "moderator" | null>(null);
  const [leaf, setLeaf] = useState<LeafKey>(() => (localStorage.getItem(LS_LEAF) as LeafKey) || "dashboard");
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(LS_COLLAPSED) === "1");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const badges = useAdminBadges(!!role);

  useEffect(() => { localStorage.setItem(LS_LEAF, leaf); }, [leaf]);
  useEffect(() => { localStorage.setItem(LS_COLLAPSED, collapsed ? "1" : "0"); }, [collapsed]);

  useEffect(() => {
    (async () => {
      const { authClient } = await import("@/api");
      const res = await authClient.current();
      if (res.data?.user) {
        if (res.data.roles.includes("admin")) setRole("admin");
        else if (res.data.roles.includes("moderator")) setRole("moderator");
      }
      setAuthChecked(true);
    })();
  }, []);

  // ⌘K / Ctrl+K to open search
  useEffect(() => {
    if (!role) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [role]);

  const visibleModules = useMemo(
    () => NAV_MODULES.map((g) => ({ ...g, leaves: g.leaves.filter((l) => role === "admin" || !l.adminOnly) }))
                     .filter((g) => g.leaves.length > 0),
    [role],
  );

  const currentGroup = findGroupForLeaf(leaf) || visibleModules[0];

  const goLeaf = useCallback((next: LeafKey, payload?: any) => {
    setLeaf(next);
    setMobileNavOpen(false);
    if (payload?.id) sessionStorage.setItem(`admin.${next}.focusId`, String(payload.id));
    if (payload?.action) sessionStorage.setItem(`admin.${next}.action`, String(payload.action));
  }, []);

  const handleQuickCreate = useCallback((next: LeafKey, action?: string) => {
    setLeaf(next);
    if (action) sessionStorage.setItem(`admin.${next}.action`, action);
  }, []);

  const signOut = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.rpc("log_audit_event", { _action: "staff_signed_out", _target_type: "auth", _target_id: user.id, _details: { email: user.email } });
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">Loading…</div>;
  }
  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 px-6 text-center">
        <Shield size={42} className="mb-4 text-amber-400" />
        <h1 className="text-2xl font-semibold mb-2">Staff sign-in required</h1>
        <p className="text-sm text-slate-400 mb-6">Sign in with your staff email and password to access the admin portal.</p>
        <div className="flex gap-3">
          <Link to="/admin/login" className="px-5 py-2.5 rounded-full bg-amber-500 text-slate-950 text-sm font-semibold">Sign in</Link>
          <Link to="/" className="px-5 py-2.5 rounded-full border border-slate-700 text-slate-300 text-sm font-semibold">Back to site</Link>
        </div>
      </div>
    );
  }

  const leafMeta = ALL_LEAVES.find((l) => l.key === leaf);

  return (
    <div dir="ltr" className="admin-shell min-h-screen flex bg-slate-950 text-slate-100" style={{ fontFamily: "'DM Sans', system-ui" }}>
      {/* Mobile overlay backdrop */}
      {mobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ── Column 1: Primary sidebar ─────────────────────────────────── */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-[68px] flex-shrink-0 border-r border-slate-800 bg-[#0D1B2A] flex flex-col items-center py-4 gap-1 transition-transform md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Link to="/" className="mb-3 flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition" title="RufayQ">
          <Shield size={18} />
        </Link>
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2 overflow-y-auto">
          {visibleModules.map((g) => {
            const Icon = g.icon;
            const active = currentGroup?.key === g.key;
            // Sum badges within this group
            const groupBadges = g.leaves.reduce((s, l) => s + (l.badgeKey ? badges[l.badgeKey] : 0), 0);
            return (
              <button
                key={g.key}
                onClick={() => goLeaf(g.leaves[0].key)}
                title={g.label}
                className={`relative w-full h-12 rounded-xl flex items-center justify-center transition group ${
                  active ? "bg-amber-500/15 text-amber-300" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                }`}
              >
                <Icon size={18} />
                {groupBadges > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                    {groupBadges > 99 ? "99+" : groupBadges}
                  </span>
                )}
                {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-amber-400" />}
                <span className="hidden md:inline absolute left-full ml-2 px-2 py-1 rounded-md bg-slate-800 text-[11px] text-slate-100 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-30 shadow-lg">
                  {g.label}
                </span>
              </button>
            );
          })}
        </nav>
        <button onClick={signOut} title="Sign out" className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 transition">
          <LogOut size={16} />
        </button>
      </aside>

      {/* ── Column 2: Secondary submenu ──────────────────────────────── */}
      <div
        className={`fixed md:static inset-y-0 left-[68px] z-40 transition-transform md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-[120%] md:translate-x-0"
        }`}
      >
        <SecondaryPanel
          group={currentGroup}
          activeLeaf={leaf}
          onPick={(k) => goLeaf(k)}
          badges={badges}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          role={role}
        />
      </div>

      {/* ── Column 3: Main workspace ─────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col w-full">
        <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <div className="px-3 sm:px-4 md:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="md:hidden w-9 h-9 rounded-md bg-slate-800/70 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0"
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0 flex-1">
              <Home size={12} className="text-slate-600 hidden sm:inline" />
              <ChevronRight size={11} className="text-slate-700 hidden sm:inline" />
              <span className="hidden sm:inline">{currentGroup?.label}</span>
              <ChevronRight size={11} className="text-slate-700 hidden sm:inline" />
              <span className="text-slate-200 font-medium truncate">{leafMeta?.label || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/70 border border-slate-700 text-xs text-slate-400 hover:text-slate-100 hover:border-slate-600 transition"
              >
                <Search size={12} />
                <span>Search…</span>
                <kbd className="ml-2 font-mono text-[10px] border border-slate-700 rounded px-1 py-0.5">⌘K</kbd>
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden w-9 h-9 rounded-md bg-slate-800/70 border border-slate-700 text-slate-400 flex items-center justify-center"
                aria-label="Search"
              >
                <Search size={14} />
              </button>
              <QuickCreateMenu onPick={handleQuickCreate} />
              <AdminTopbarPrefs />
              <AdminPermissionsDebug />
              <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 uppercase tracking-wide">{role}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 sm:px-4 md:px-6 py-4 md:py-6 overflow-y-auto">
          {(() => {
            // Permission-driven gating. Server RLS remains the source of truth;
            // these checks only hide/disable UI we know the user can't action.
            const isAdmin = role === "admin";
            const gate = (allowed: boolean, title: string, hint = "Admin role required.") =>
              allowed ? null : <ComingSoon title={title} hint={hint} />;

            if (leaf === "settings_general") return <AdminSettingsGeneral />;
            if (leaf === "settings_team") return gate(isAdmin, "Team & Roles", "Admin role required to view this screen.") ?? <AdminSettingsTeam />;
            switch (leaf) {
              case "dashboard": return <AdminDashboard />;
              case "users": return <AdminUsers />;
              case "user_search": return gate(isAdmin, "Search & Assign") ?? <AdminUserSearch />;
              case "create": return gate(isAdmin, "Create User") ?? <AdminCreateUser />;
              case "cs_users": return gate(isAdmin, "Customer Service") ?? <AdminCustomerService />;
              case "verify_assist": return <AdminVerificationAssist />;
              case "orgs": return <AdminOrganizations />;
              case "applications": return <AdminProviderApplications />;
              case "claims": return <AdminPatientClaims />;
              case "rcm": return gate(isAdmin, "RCM Masters") ?? <AdminRcmMasters />;
              case "rcm_activations": return gate(isAdmin, "RCM Activations") ?? <AdminRcmActivations />;
              case "rcm_imports": return gate(isAdmin, "RCM Imports") ?? <AdminRcmImports />;
              case "rcm_bulk": return gate(isAdmin, "RCM Bulk Ops") ?? <AdminRcmBulkOps />;
              case "subs": return gate(isAdmin, "Subscriptions") ?? <AdminSubscriptions />;
              case "payments": return gate(isAdmin, "Payments & Receipts") ?? <AdminPayments />;
              case "ai_usage": return gate(isAdmin, "AI Usage") ?? <AdminAiUsage />;
              case "reviews": return <AdminReviews />;
              case "tickets": return <AdminTickets />;
              case "news": return <AdminNews />;
              case "pages": return <AdminPages />;
              case "website_cms": return gate(isAdmin, "Website CMS") ?? <AdminWebsiteCms />;
              case "cms_seo": return gate(isAdmin, "SEO Manager") ?? <AdminCmsSeo />;
              case "cms_media": return gate(isAdmin, "Media Library") ?? <AdminCmsMedia />;
              case "cms_blog_cats": return gate(isAdmin, "Blog Categories") ?? <AdminCmsBlogCategories />;
              case "audit": return <AdminAuditLog />;
              default: return <ComingSoon title="Coming soon" />;
            }
          })()}
        </main>
      </div>

      <GlobalSearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} onPick={(k, payload) => goLeaf(k, payload)} />
    </div>
  );
};

export default Admin;
