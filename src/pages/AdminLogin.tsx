import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Seo } from "@/seo/Seo";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email and password are required");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error("Sign-in failed", { description: error?.message || "Check your credentials" });
      return;
    }
    // Verify role
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const STAFF_ROLES: readonly string[] = ["admin", "moderator", "qc_tester"];
    const isStaff = roles?.some((r) => STAFF_ROLES.includes(r.role));
    setLoading(false);
    if (!isStaff) {
      await supabase.auth.signOut();
      toast.error("This account doesn't have admin, support, or QC access.");
      return;
    }
    // Audit: staff sign-in
    await supabase.rpc("log_audit_event", {
      _action: "staff_signed_in",
      _target_type: "auth",
      _target_id: data.user.id,
      _details: { email: data.user.email, roles: roles?.map((r: any) => r.role) },
    });
    toast.success("Welcome back");
    navigate("/admin");
  };

  return (
    <>
      <Seo
        title="Admin sign-in — RufayQ"
        description="Staff sign-in for RufayQ administrators and moderators."
        noindex
      />
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4" style={{ fontFamily: "'DM Sans', system-ui" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6">
          <ArrowLeft size={14} /> Back to site
        </Link>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
              <Shield size={26} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-semibold">RufayQ Staff Portal</h1>
            <p className="text-xs text-slate-400 mt-1">Admin & support sign-in only</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rufayq.com"
                autoComplete="email"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-800/60 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none text-sm transition"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">Password</label>
              <div className="flex items-center rounded-xl bg-slate-800/60 border border-slate-700 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="flex-1 bg-transparent px-3.5 py-3 outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="px-3 text-slate-400 hover:text-white">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-semibold text-sm hover:bg-amber-400 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign in to Admin"}
            </button>
          </form>

          <p className="text-[10px] text-slate-500 text-center mt-6">
            Patient sign-in is on the main app. This portal is staff-only and access is logged.
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default AdminLogin;
