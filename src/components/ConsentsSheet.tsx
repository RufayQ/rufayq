import { useEffect, useState } from "react";
import { X, ShieldCheck, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceId";
import { toast } from "sonner";

const SECTIONS = [
  { key: "records", en: "Medical Records", ar: "السجلات الطبية" },
  { key: "labs", en: "Lab Results", ar: "نتائج المختبر" },
  { key: "rads", en: "Radiology", ar: "الأشعة" },
  { key: "meds", en: "Medications", ar: "الأدوية" },
  { key: "appointments", en: "Appointments", ar: "المواعيد" },
  { key: "journey", en: "Journey", ar: "الرحلة" },
  { key: "rcm", en: "Billing / RCM", ar: "الفوترة" },
] as const;

interface Claim {
  id: string;
  organization_id: string;
  status: string;
  org_name: string;
}
interface Consent { organization_id: string; section: string; granted: boolean }

interface Props { onClose: () => void }

const ConsentsSheet = ({ onClose }: Props) => {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: claimsData } = await supabase
      .from("patient_claims")
      .select("id, organization_id, status, organizations:organization_id(name)")
      .in("status", ["pending_patient", "approved"]);
    const mapped: Claim[] = (claimsData || []).map((c: any) => ({
      id: c.id, organization_id: c.organization_id, status: c.status,
      org_name: c.organizations?.name || "Provider",
    }));
    setClaims(mapped);

    const { data: consentsData } = await supabase
      .from("patient_consents")
      .select("organization_id, section, granted");
    setConsents((consentsData || []) as Consent[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isGranted = (org: string, section: string) =>
    consents.some((c) => c.organization_id === org && c.section === section && c.granted);

  const toggle = async (org: string, section: string, claimId: string) => {
    const device_id = getDeviceId();
    const next = !isGranted(org, section);
    const { error } = await supabase
      .from("patient_consents")
      .upsert({
        patient_device_id: device_id,
        organization_id: org,
        section: section as any,
        claim_id: claimId,
        granted: next,
        revoked_at: next ? null : new Date().toISOString(),
      } as any, { onConflict: "patient_device_id,organization_id,section" });
    if (error) { toast.error(error.message); return; }
    toast.success(next ? "Access granted · مُنح الوصول" : "Access revoked · أُلغي الوصول");
    await load();
  };

  const approveClaim = async (claimId: string) => {
    const { error } = await supabase
      .from("patient_claims")
      .update({ status: "approved", patient_decision_at: new Date().toISOString() } as any)
      .eq("id", claimId);
    if (error) { toast.error(error.message); return; }
    toast.success("Provider approved · تم اعتماد المزوّد");
    await load();
  };

  const rejectClaim = async (claimId: string) => {
    const { error } = await supabase
      .from("patient_claims")
      .update({ status: "rejected", patient_decision_at: new Date().toISOString() } as any)
      .eq("id", claimId);
    if (error) { toast.error(error.message); return; }
    toast.success("Provider rejected");
    await load();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "var(--off-white)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--navy)", color: "white" }}>
        <button onClick={onClose} className="btn-press"><X size={20} /></button>
        <p className="font-display text-base">Provider Access</p>
        <span className="w-5" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-center text-[12px]" style={{ color: "var(--gray)" }}>Loading…</p>}

        {!loading && claims.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheck size={36} className="mx-auto mb-3" style={{ color: "var(--teal-deep)" }} />
            <p className="text-[13px]" style={{ color: "var(--navy)" }}>No provider access requests yet.</p>
            <p className="font-arabic text-[11px] mt-1" dir="rtl" style={{ color: "var(--gray)" }}>لا توجد طلبات وصول</p>
          </div>
        )}

        {!loading && claims.map((c) => (
          <div key={c.id} className="rounded-xl p-3 space-y-2" style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}>
            <div className="flex items-center gap-2">
              <Building2 size={16} style={{ color: "var(--teal-deep)" }} />
              <p className="font-semibold text-[13px] flex-1" style={{ color: "var(--navy)" }}>{c.org_name}</p>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
                style={{
                  background: c.status === "approved" ? "var(--teal-deep)" : "var(--gold)",
                  color: c.status === "approved" ? "white" : "var(--navy)",
                }}>
                {c.status === "pending_patient" ? "Awaiting you" : c.status}
              </span>
            </div>

            {c.status === "pending_patient" && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => approveClaim(c.id)} className="flex-1 py-2 rounded-lg text-[12px] font-bold btn-press" style={{ background: "var(--teal-deep)", color: "white" }}>
                  Approve
                </button>
                <button onClick={() => rejectClaim(c.id)} className="flex-1 py-2 rounded-lg text-[12px] font-bold btn-press" style={{ background: "var(--gray-light)", color: "var(--navy)" }}>
                  Reject
                </button>
              </div>
            )}

            {c.status === "approved" && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-mono tracking-wider" style={{ color: "var(--gray)" }}>SECTION ACCESS</p>
                {SECTIONS.map((s) => {
                  const on = isGranted(c.organization_id, s.key);
                  return (
                    <div key={s.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-[12px]" style={{ color: "var(--navy)" }}>{s.en}</p>
                        <p className="font-arabic text-[10px]" dir="rtl" style={{ color: "var(--gray)" }}>{s.ar}</p>
                      </div>
                      <button onClick={() => toggle(c.organization_id, s.key, c.id)} className="w-10 h-5 rounded-full relative transition-all"
                        style={{ background: on ? "var(--teal-deep)" : "var(--gray-light)" }}>
                        <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: on ? 22 : 2 }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConsentsSheet;
