import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Star, MessageSquare, Users, LogOut, CreditCard, FileText } from "lucide-react";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";
import AdminReviews from "@/components/admin/AdminReviews";
import AdminTickets from "@/components/admin/AdminTickets";
import AdminPages from "@/components/admin/AdminPages";

type Tab = "users" | "subs" | "reviews" | "tickets" | "pages";

const TABS: { key: Tab; label: string; Icon: typeof Users }[] = [
  { key: "users", label: "Users", Icon: Users },
  { key: "subs", label: "Subscriptions", Icon: CreditCard },
  { key: "reviews", label: "Reviews", Icon: Star },
  { key: "tickets", label: "Support Tickets", Icon: MessageSquare },
  { key: "pages", label: "Site Pages", Icon: FileText },
];

const Admin = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setAuthChecked(true); setIsAdmin(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      setAuthChecked(true);
    })();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">Loading…</div>;
  }
  if (!isAdmin) {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'DM Sans', system-ui" }}>
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-amber-400" />
            <h1 className="text-lg font-semibold">RufayQ Admin</h1>
          </div>
          <button onClick={signOut} className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5">
            <LogOut size={14} /> Sign out
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, Icon }) => (
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
        {tab === "users" && <AdminUsers />}
        {tab === "subs" && <AdminSubscriptions />}
        {tab === "reviews" && <AdminReviews />}
        {tab === "tickets" && <AdminTickets />}
        {tab === "pages" && <AdminPages />}
      </main>
    </div>
  );
};

export default Admin;
