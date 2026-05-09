/**
 * DischargeSignoffCard — three-stage sign-off (Nursing → Pharmacy → Physician)
 * followed by a financial-discharge advance. Wraps providerClient.admission.*
 * which validates ordering before calling the rcm_advance_discharge RPC.
 */
import { CheckCircle2, Stethoscope, Pill, UserCheck, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { providerClient } from "@/api/clients/provider.client";
import Can from "@/components/auth/Can";

interface SignoffState {
  id?: string;
  nursing_signed_at?: string | null;
  pharmacy_signed_at?: string | null;
  physician_signed_at?: string | null;
}

interface Props {
  admissionId: string;
  signoff: SignoffState | null;
  financialDischargedAt?: string | null;
  onChange?: () => void;
}

const Row = ({
  label, icon: Icon, signed, onSign,
}: { label: string; icon: any; signed: string | null | undefined; onSign: () => void }) => (
  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
    <div className="flex items-center gap-2 text-xs text-slate-300">
      <Icon size={13} className="text-amber-400" /> {label}
    </div>
    {signed ? (
      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
        <CheckCircle2 size={11} /> {new Date(signed).toLocaleString()}
      </span>
    ) : (
      <Can action="provider.rcm.discharge.signoff">
        <button onClick={onSign} className="px-2 py-1 rounded bg-amber-500 text-slate-950 text-[11px] font-semibold">Sign</button>
      </Can>
    )}
  </div>
);

const DischargeSignoffCard = ({ admissionId, signoff, financialDischargedAt, onChange }: Props) => {
  const sign = async (kind: "nursing" | "pharmacy" | "physician") => {
    const res = await providerClient.admission.recordSignoff(admissionId, kind);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(`${kind} sign-off recorded`);
    onChange?.();
  };

  const advanceFinancial = async () => {
    const res = await providerClient.admission.advanceStage(
      admissionId, "financial_discharge",
      {
        nursing_signed_at: signoff?.nursing_signed_at,
        pharmacy_signed_at: signoff?.pharmacy_signed_at,
        physician_signed_at: signoff?.physician_signed_at,
      },
      "Financial discharge",
    );
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Financial discharge recorded");
    onChange?.();
  };

  const allSigned = !!(signoff?.nursing_signed_at && signoff?.pharmacy_signed_at && signoff?.physician_signed_at);

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-amber-400">Discharge sign-offs</p>
      <Row label="Nursing"   icon={UserCheck}  signed={signoff?.nursing_signed_at}   onSign={() => sign("nursing")} />
      <Row label="Pharmacy"  icon={Pill}       signed={signoff?.pharmacy_signed_at}  onSign={() => sign("pharmacy")} />
      <Row label="Physician" icon={Stethoscope} signed={signoff?.physician_signed_at} onSign={() => sign("physician")} />

      <Can action="provider.rcm.discharge.advance_financial">
        <button onClick={advanceFinancial} disabled={!allSigned || !!financialDischargedAt}
          className="w-full mt-1 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40">
          <DollarSign size={12} />
          {financialDischargedAt ? `Financially discharged ${new Date(financialDischargedAt).toLocaleDateString()}` : "Advance to financial discharge"}
        </button>
      </Can>
      {!allSigned && <p className="text-[10px] text-slate-500">All three sign-offs are required before financial discharge.</p>}
    </div>
  );
};

export default DischargeSignoffCard;
