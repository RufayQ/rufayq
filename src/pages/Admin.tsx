import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Star, MessageSquare, Users, LogOut, CreditCard, FileText, Building2, UserPlus, Activity, LayoutDashboard, Briefcase } from "lucide-react";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminTickets from "@/components/admin/AdminTickets";
import AdminPages from "@/components/admin/AdminPages";
import AdminOrganizations from "@/components/admin/AdminOrganizations";
import AdminCreateUser from "@/components/admin/AdminCreateUser";
import AdminAuditLog from "@/components/admin/AdminAuditLog";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminProviderApplications from "@/components/admin/AdminProviderApplications";
import AdminPatientClaims from "@/components/admin/AdminPatientClaims";

type Tab = "dashboard" | "users" | "create" | "orgs" | "applications" | "claims" | "subs" | "reviews" | "tickets" | "pages" | "audit";

const ALL_TABS: { key: Tab; label: string; Icon: typeof Users; adminOnly?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "users", label: "Users", Icon: Users },
  { key: "create", label: "Create User", Icon: UserPlus, adminOnly: true },
  { key: "orgs", label: "Organizations", Icon: Building2 },
  { key: "applications", label: "Applications", Icon: Briefcase },
  { key: "claims", label: "Patient Claims", Icon: UserPlus },
  { key: "subs", label: "Subscriptions", Icon: CreditCard, adminOnly: true },
  { key: "reviews", label: "Reviews", Icon: Star },
  { key: "tickets", label: "Tickets", Icon: MessageSquare },
  { key: "pages", label: "Site Pages", Icon: FileText, adminOnly: true },
  { key: "audit", label: "Audit Log", Icon: Activity },
];

const Admin = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState<"admin" | "moderator" | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");

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

  const visibleTabs = ALL_TABS.filter(t => role === "admin" || !t.adminOnly);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'DM Sans', system-ui" }}>
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-amber-400" />
            <h1 className="text-lg font-semibold">RufayQ Admin</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 uppercase tracking-wide">{role}</span>
          </div>
          <button onClick={signOut} className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5">
            <LogOut size={14} /> Sign out
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {visibleTabs.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 whitespace-nowrap ${
                tab === key ? "border-amber-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === "dashboard" && <AdminDashboard />}
        {tab === "users" && <AdminUsers />}
        {tab === "create" && role === "admin" && <AdminCreateUser />}
        {tab === "orgs" && <AdminOrganizations />}
        {tab === "applications" && <AdminProviderApplications />}
        {tab === "claims" && <AdminPatientClaims />}
        {tab === "subs" && role === "admin" && <AdminSubscriptions />}
        {tab === "reviews" && <AdminReviews />}
        {tab === "tickets" && <AdminTickets />}
        {tab === "pages" && role === "admin" && <AdminPages />}
        {tab === "audit" && <AdminAuditLog />}
      </main>
    </div>
  );
};

export default Admin;
