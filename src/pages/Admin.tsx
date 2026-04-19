import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Check, X, Trash2, Star, MessageSquare, Users, LogOut, Pause, Play, Ban } from "lucide-react";

type Tab = "reviews" | "tickets" | "users";

interface Review {
  id: string; rating: number; reviewer_name: string | null; reviewer_country: string | null;
  notes: string | null; advice: string | null; approved: boolean; created_at: string;
}
interface Ticket {
  id: string; ticket_number: string; title: string; description: string;
  category: string; priority: string; status: string; user_email: string | null;
  user_name: string | null; created_at: string; resolution_notes: string | null;
}
interface UserRow {
  user_id: string; status: "active" | "on_hold" | "suspended"; reason: string | null; updated_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Gate: must be logged in AND have admin role
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setAuthChecked(true); setIsAdmin(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      setAuthChecked(true);
    })();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("app_reviews").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setReviews((data || []) as Review[]);
    setLoading(false);
  };
  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setTickets((data || []) as Ticket[]);
    setLoading(false);
  };
  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("user_status").select("*").order("updated_at", { ascending: false });
    if (error) toast.error(error.message); else setUsers((data || []) as UserRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "reviews") loadReviews();
    if (tab === "tickets") loadTickets();
    if (tab === "users") loadUsers();
  }, [tab, isAdmin]);

  const setReviewApproved = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("app_reviews").update({ approved }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(approved ? "Approved" : "Unapproved"); loadReviews(); }
  };
  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("app_reviews").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); loadReviews(); }
  };

  const updateTicket = async (id: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status: status as never }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); loadTickets(); }
  };

  const updateUserStatus = async (user_id: string, status: UserRow["status"]) => {
    const reason = status !== "active" ? prompt(`Reason for ${status}?`) || null : null;
    const { error } = await supabase.from("user_status").update({ status, reason }).eq("user_id", user_id);
    if (error) toast.error(error.message); else { toast.success(`User ${status}`); loadUsers(); }
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate("/"); };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-300 px-6 text-center">
        <Shield size={42} className="mb-4 text-amber-400" />
        <h1 className="text-2xl font-semibold mb-2">Admin access required</h1>
        <p className="text-sm text-slate-400 mb-6">You must be signed in as an admin to view this page.</p>
        <Link to="/app" className="px-5 py-2.5 rounded-full bg-amber-500 text-slate-950 text-sm font-semibold">Open app</Link>
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
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {([
            ["reviews", "Reviews", Star],
            ["tickets", "Support Tickets", MessageSquare],
            ["users", "Users", Users],
          ] as const).map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                tab === k ? "border-amber-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}>
              <Icon size={14} /> {l}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading && <p className="text-slate-400 text-sm">Loading…</p>}

        {tab === "reviews" && !loading && (
          <div className="space-y-3">
            {reviews.length === 0 && <p className="text-slate-500 text-sm">No reviews yet.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">
                        {[1,2,3,4,5].map(n => <Star key={n} size={14} fill={n <= r.rating ? "#C5965A" : "transparent"} color="#C5965A" strokeWidth={1.5} />)}
                      </div>
                      <span className="text-xs text-slate-400">{r.reviewer_name || "Anonymous"}{r.reviewer_country ? ` · ${r.reviewer_country}` : ""}</span>
                      <span className="text-xs text-slate-600">· {new Date(r.created_at).toLocaleDateString()}</span>
                      {r.approved
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">Approved</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">Pending</span>}
                    </div>
                    <p className="text-sm text-slate-200 mb-1">{r.notes}</p>
                    {r.advice && <p className="text-xs text-slate-400 italic">Advice: {r.advice}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!r.approved
                      ? <button onClick={() => setReviewApproved(r.id, true)} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-medium flex items-center gap-1.5"><Check size={12}/>Approve</button>
                      : <button onClick={() => setReviewApproved(r.id, false)} className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-medium flex items-center gap-1.5"><X size={12}/>Unapprove</button>}
                    <button onClick={() => deleteReview(r.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-medium flex items-center gap-1.5"><Trash2 size={12}/>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "tickets" && !loading && (
          <div className="space-y-3">
            {tickets.length === 0 && <p className="text-slate-500 text-sm">No tickets yet.</p>}
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-amber-400">{t.ticket_number}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{t.category}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{t.priority}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">{t.status}</span>
                    </div>
                    <h3 className="font-semibold text-sm">{t.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{t.user_name || "—"} · {t.user_email || "no email"} · {new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <select value={t.status} onChange={(e) => updateTicket(t.id, e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200">
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{t.description}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "users" && !loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                <tr><th className="text-left px-4 py-3">User ID</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Reason</th><th className="text-left px-4 py-3">Updated</th><th className="text-right px-4 py-3">Actions</th></tr>
              </thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No users yet.</td></tr>}
                {users.map((u) => (
                  <tr key={u.user_id} className="border-t border-slate-800">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{u.user_id.slice(0,8)}…</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.status === "active" ? "bg-emerald-500/15 text-emerald-300"
                        : u.status === "on_hold" ? "bg-amber-500/15 text-amber-300"
                        : "bg-rose-500/15 text-rose-300"
                      }`}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{u.reason || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(u.updated_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1.5">
                        <button onClick={() => updateUserStatus(u.user_id, "active")} disabled={u.status === "active"} className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300 text-xs disabled:opacity-30 flex items-center gap-1"><Play size={11}/>Activate</button>
                        <button onClick={() => updateUserStatus(u.user_id, "on_hold")} disabled={u.status === "on_hold"} className="px-2 py-1 rounded bg-amber-500/15 text-amber-300 text-xs disabled:opacity-30 flex items-center gap-1"><Pause size={11}/>Hold</button>
                        <button onClick={() => updateUserStatus(u.user_id, "suspended")} disabled={u.status === "suspended"} className="px-2 py-1 rounded bg-rose-500/15 text-rose-300 text-xs disabled:opacity-30 flex items-center gap-1"><Ban size={11}/>Suspend</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
