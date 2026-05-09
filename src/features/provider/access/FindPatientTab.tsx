/**
 * FindPatientTab — combined search + claim flow + EMR access request.
 *
 * Wraps PatientSearch (Saudi ID / Iqama / Passport) and lets the doctor
 * either submit a patient_claims row (existing CRM flow) OR — if the patient
 * has a known device id — open RequestAccessSheet to request consented EMR
 * access directly.
 */
import { useState } from "react";
import { Lock, Send } from "lucide-react";
import PatientSearch from "@/components/provider/PatientSearch";
import RequestAccessSheet from "./RequestAccessSheet";
import { validatePatientSearch, fieldErrorMap } from "@/lib/providerValidation";
import { providerClient } from "@/api/clients/provider.client";
import { toast } from "sonner";

interface Props { organizationId: string }

const FindPatientTab = ({ organizationId }: Props) => {
  const [quickType, setQuickType] = useState<"saudi_id" | "iqama" | "passport">("saudi_id");
  const [quickValue, setQuickValue] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [matchedDevice, setMatchedDevice] = useState<string | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [searching, setSearching] = useState(false);

  const onQuickRequest = async () => {
    const issues = validatePatientSearch({ type: quickType, value: quickValue });
    const map = fieldErrorMap(issues);
    setErrs(map);
    if (issues.some((i) => i.level === "error")) return;
    setSearching(true);
    const res = await providerClient.patientSearch.search(quickType, quickValue);
    setSearching(false);
    if (res.error) { toast.error(res.error.message); return; }
    if (!res.data?.matched || !res.data.device_id) { toast.error("No registered patient found — submit a claim instead."); return; }
    setMatchedDevice(res.data.device_id);
    setShowSheet(true);
  };

  return (
    <div className="space-y-5">
      {/* Quick consent-request flow */}
      <div className="rounded-xl p-4 bg-slate-900/40 border border-amber-500/30 space-y-3">
        <div className="flex items-start gap-2">
          <Lock className="text-amber-400 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-semibold text-slate-100">Have the patient's ID? Request EMR access directly.</p>
            <p className="text-[11px] text-slate-500">
              The patient gets an in-app consent prompt. You only see sections they approve.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {(["saudi_id", "iqama", "passport"] as const).map((t) => (
            <button key={t} onClick={() => setQuickType(t)}
              className={`py-1.5 rounded-lg text-[11px] font-semibold ${quickType === t ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
              {t === "saudi_id" ? "Saudi ID" : t === "iqama" ? "Iqama" : "Passport"}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={quickValue} onChange={(e) => setQuickValue(e.target.value)}
            placeholder={quickType === "saudi_id" ? "10 digits" : quickType === "iqama" ? "10 digits starting 1 or 2" : "6–9 alphanumeric"}
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-100" />
          <button onClick={onQuickRequest} disabled={searching}
            className="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
            <Send size={12} /> {searching ? "…" : "Request access"}
          </button>
        </div>
        {errs.value && <p className="text-[11px] text-rose-400">{errs.value}</p>}
        {errs.type && <p className="text-[11px] text-rose-400">{errs.type}</p>}
      </div>

      {/* Existing claim-submission path */}
      <PatientSearch organizationId={organizationId} />

      {showSheet && matchedDevice && (
        <RequestAccessSheet
          organizationId={organizationId}
          patientDeviceId={matchedDevice}
          onClose={() => setShowSheet(false)}
        />
      )}
    </div>
  );
};

export default FindPatientTab;
