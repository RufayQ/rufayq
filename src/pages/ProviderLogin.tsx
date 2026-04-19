import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Stethoscope, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import RufayQLogo from "@/components/RufayQLogo";

const ProviderLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const BG = "#06101A", BG2 = "#0B1A28", BORDER = "rgba(197,150,90,0.18)";
  const TEXT = "#E8ECF0", MUTED = "rgba(232,236,240,0.6)", GOLD = "#C5965A", TEAL = "#0FB5C9";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.session) {
      setBusy(false);
      toast.error(error?.message || "Invalid credentials");
      return;
    }
    // Verify org membership
    const { data: members } = await supabase
      .from("provider_members")
      .select("organization_id, is_active")
      .eq("user_id", data.session.user.id)
      .eq("is_active", true);
    if (!members || members.length === 0) {
      await supabase.auth.signOut();
      setBusy(false);
      toast.error("This account is not linked to an approved provider organization yet.");
      return;
    }
    toast.success("Welcome back");
    navigate("/provider", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG, color: TEXT, fontFamily: "'DM Sans', system-ui" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-sm" style={{ color: MUTED }}>
          <ArrowLeft size={14} /> Back to home
        </Link>

        <div className="rounded-3xl p-8" style={{ background: BG2, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3 mb-2">
            <RufayQLogo size={36} variant="light" />
            <Stethoscope size={20} color={GOLD} />
          </div>
          <h1 className="font-display text-3xl mb-1" style={{ fontWeight: 300 }}>Provider Portal</h1>
          <p className="text-xs mb-6" dir="rtl" style={{ color: GOLD }}>بوابة مقدّمي الرعاية</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: MUTED }}>Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
                placeholder="provider@hospital.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: MUTED }}>Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>
            <button
              type="submit" disabled={busy}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: GOLD, color: BG }}
            >
              <Lock size={14} /> {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-xs mt-6 text-center" style={{ color: MUTED }}>
            Not registered yet?{" "}
            <Link to="/providers" style={{ color: TEAL }}>Apply as a provider</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProviderLogin;
