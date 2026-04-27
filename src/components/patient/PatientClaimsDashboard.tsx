/**
 * PatientClaimsDashboard — live feed of organization access requests for the
 * current patient device. Updates instantly via realtime as admins approve,
 * the patient consents, or claims get rejected.
 *
 * Drop into any patient screen:
 *   <PatientClaimsDashboard />
 */
import { ShieldCheck, Hospital, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { usePatientClaims, type PatientClaim } from "@/hooks/usePatientClaims";

const STATUS_TONE: Record<string, { label: string; classes: string; Icon: typeof ShieldCheck }> = {
  pending_admin: { label: "Awaiting verification", classes: "bg-slate-700 text-slate-200", Icon: Clock },
  pending_patient: { label: "Action needed", classes: "bg-amber-500/20 text-amber-300 border border-amber-500/40", Icon: AlertCircle },
  approved: { label: "Approved", classes: "bg-emerald-500/20 text-emerald-300", Icon: CheckCircle2 },
  rejected: { label: "Rejected", classes: "bg-rose-500/20 text-rose-300", Icon: XCircle },
};

const fmt = (iso: string) => new Date(iso).toLocaleString();

const ClaimRow = ({ c }: { c: PatientClaim }) => {
  const tone = STATUS_TONE[c.status] ?? { label: c.status, classes: "bg-slate-700 text-slate-200", Icon: ShieldCheck };
  const { Icon } = tone;
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-amber-300 shrink-0">
          <Hospital size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-100 truncate">{c.org_name ?? "Healthcare provider"}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            asked to link your record · {c.search_type}: <span className="font-mono text-slate-300">{c.search_value}</span>
          </p>
          {c.reason && <p className="text-xs text-slate-300 italic mt-1">“{c.reason}”</p>}
          <p className="text-[10px] text-slate-500 mt-1">requested {fmt(c.created_at)}</p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full font-mono inline-flex items-center gap-1 shrink-0 ${tone.classes}`}>
          <Icon size={10} />{tone.label}
        </span>
      </div>
    </li>
  );
};

export const PatientClaimsDashboard = () => {
  const { claims, loading } = usePatientClaims();

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-100">Provider access requests</h2>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">live</span>
      </header>

      {loading && <p className="text-xs text-slate-500">Loading…</p>}

      {!loading && claims.length === 0 && (
        <p className="text-xs text-slate-500 py-6 text-center">
          No providers have requested access to your record yet.
        </p>
      )}

      {!loading && claims.length > 0 && (
        <ul className="space-y-2">
          {claims.map((c) => <ClaimRow key={c.id} c={c} />)}
        </ul>
      )}
    </section>
  );
};

export default PatientClaimsDashboard;
