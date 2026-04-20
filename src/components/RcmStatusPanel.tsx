import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { ShieldCheck, FileText, Activity } from "lucide-react";

interface Membership { id: string; member_number: string; effective_from: string; effective_to: string | null; payer_id: string; }
interface Eligibility { id: string; status: string; exception_type: string; nphies_reference: string | null; checked_at: string; payer_id: string | null; }

const STATUS_BADGE: Record<string, string> = {
  eligible: "bg-emerald-500/15 text-emerald-700",
  not_eligible: "bg-rose-500/15 text-rose-700",
  pending: "bg-amber-500/15 text-amber-700",
  error: "bg-slate-500/15 text-slate-700",
};

const RcmStatusPanel = () => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility[]>([]);
  const [payers, setPayers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const did = getDeviceId();
      const [{ data: m }, { data: e }, { data: p }] = await Promise.all([
        (supabase as any).from("rcm_payer_memberships").select("*").eq("patient_device_id", did).order("created_at", { ascending: false }),
        (supabase as any).from("rcm_eligibility_checks").select("*").eq("patient_device_id", did).order("checked_at", { ascending: false }).limit(5),
        (supabase as any).from("rcm_payers").select("id, name"),
      ]);
      setMemberships(m || []); setEligibility(e || []);
      const map: Record<string, string> = {};
      (p || []).forEach((x: any) => { map[x.id] = x.name; });
      setPayers(map);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-[11px] px-4 py-3" style={{ color: "var(--gray)" }}>Loading insurance status…</p>;
  if (memberships.length === 0 && eligibility.length === 0) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
        <ShieldCheck size={20} className="mx-auto mb-1.5" style={{ color: "var(--gray)" }} />
        <p className="text-[12px]" style={{ color: "var(--gray)" }}>No insurance coverage on file yet</p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--gray)" }}>A provider will activate it during your visit</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {memberships.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
          <div className="px-4 py-2 flex items-center gap-2" style={{ background: "var(--off-white)", borderBottom: "1px solid var(--gray-light)" }}>
            <FileText size={12} style={{ color: "var(--teal-deep)" }} />
            <p className="text-[11px] font-semibold" style={{ color: "var(--navy)" }}>Active Memberships ({memberships.length})</p>
          </div>
          {memberships.map(m => (
            <div key={m.id} className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--gray-light)" }}>
              <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>{payers[m.payer_id] || "Unknown payer"}</p>
              <p className="font-mono text-[10px]" style={{ color: "var(--gray)" }}>Member #{m.member_number}</p>
              <p className="text-[9px] mt-0.5" style={{ color: "var(--gray)" }}>
                Valid {new Date(m.effective_from).toLocaleDateString()} {m.effective_to && `→ ${new Date(m.effective_to).toLocaleDateString()}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {eligibility.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
          <div className="px-4 py-2 flex items-center gap-2" style={{ background: "var(--off-white)", borderBottom: "1px solid var(--gray-light)" }}>
            <Activity size={12} style={{ color: "var(--teal-deep)" }} />
            <p className="text-[11px] font-semibold" style={{ color: "var(--navy)" }}>Recent Eligibility Checks</p>
          </div>
          {eligibility.map(e => (
            <div key={e.id} className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--gray-light)" }}>
              <div>
                <p className="text-[11px]" style={{ color: "var(--navy)" }}>{e.payer_id ? payers[e.payer_id] : "—"}</p>
                <p className="text-[9px]" style={{ color: "var(--gray)" }}>{new Date(e.checked_at).toLocaleString()}</p>
              </div>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[e.status] || "bg-slate-200 text-slate-700"}`}>{e.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RcmStatusPanel;
