import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock } from "lucide-react";

interface Trial {
  id: string; device_id: string; plan: string;
  trial_started_at: string; trial_ends_at: string;
  extension_reason?: string | null; extended_at?: string | null;
}

const AdminSubscriptions = () => {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("user_trials").select("*").order("trial_ends_at", { ascending: false }).limit(500);
    if (error) toast.error(error.message); else setTrials((data || []) as Trial[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const extend = async (t: Trial, days: number) => {
    const reason = prompt(`Extend by ${days} day(s). Reason?`) || `Extended by ${days} days`;
    const newEnd = new Date(Math.max(Date.now(), new Date(t.trial_ends_at).getTime()));
    newEnd.setDate(newEnd.getDate() + days);
    const { error } = await supabase.from("user_trials").update({
      trial_ends_at: newEnd.toISOString(),
      extension_reason: reason,
      extended_at: new Date().toISOString(),
    }).eq("id", t.id);
    if (error) toast.error(error.message); else {
      await supabase.rpc("log_audit_event", { _action: "trial_extended", _target_type: "trial", _target_id: t.id, _details: { days, reason, new_end: newEnd.toISOString() } });
      toast.success(`Extended +${days}d`); load();
    }
  };

  const setPlan = async (t: Trial, plan: string) => {
    const { error } = await supabase.from("user_trials").update({ plan }).eq("id", t.id);
    if (error) toast.error(error.message); else {
      await supabase.rpc("log_audit_event", { _action: "trial_plan_changed", _target_type: "trial", _target_id: t.id, _details: { plan } });
      toast.success(`Plan set to ${plan}`); load();
    }
  };

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-3">
      {trials.length === 0 && <p className="text-slate-500 text-sm">No trials yet.</p>}
      {trials.map((t) => {
        const endsAt = new Date(t.trial_ends_at);
        const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const expired = daysLeft <= 0;
        return (
          <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${expired ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                    {expired ? "Expired" : `${daysLeft}d left`}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{t.plan}</span>
                  {t.extended_at && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">Extended</span>}
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Calendar size={11}/>{new Date(t.trial_started_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Clock size={11}/>ends {endsAt.toLocaleDateString()}</span>
                </p>
                <p className="text-[10px] text-slate-600 font-mono mt-1">{t.device_id.slice(0, 16)}…</p>
                {t.extension_reason && <p className="text-[11px] text-amber-400/80 italic mt-1">"{t.extension_reason}"</p>}
              </div>
              <select value={t.plan} onChange={(e) => setPlan(t, e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 shrink-0">
                <option value="trial">Trial</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="flex gap-1.5 pt-2 border-t border-slate-800">
              {[7, 14, 30].map((d) => (
                <button key={d} onClick={() => extend(t, d)}
                  className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 text-[11px]">+{d}d</button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminSubscriptions;
