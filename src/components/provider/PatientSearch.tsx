import { useState } from "react";
import { Search, UserPlus, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { organizationId: string; onClaimCreated?: () => void }

type SearchType = "saudi_id" | "passport" | "iqama";

interface MatchResult {
  id: string; device_id: string;
  full_name_en: string | null; full_name_ar: string | null;
  date_of_birth: string | null; gender: string | null; nationality: string | null;
}

const PatientSearch = ({ organizationId, onClaimCreated }: Props) => {
  const [type, setType] = useState<SearchType>("saudi_id");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<MatchResult | null | undefined>(undefined); // undefined=not searched
  const [submitting, setSubmitting] = useState(false);

  const search = async () => {
    if (!value.trim()) { toast.error("Enter an ID number"); return; }
    setSearching(true);
    setResult(undefined);
    const { data, error } = await supabase.functions.invoke("provider-search-patient", {
      body: { organization_id: organizationId, search_type: type, search_value: value.trim() },
    });
    setSearching(false);
    if (error) { toast.error(error.message); return; }
    setResult((data as any)?.match || null);
  };

  const submitClaim = async () => {
    if (!reason.trim()) { toast.error("Provide a clinical reason"); return; }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("patient_claims").insert({
      organization_id: organizationId,
      requested_by: user!.id,
      search_type: type,
      search_value: value.trim(),
      matched_profile_id: result?.id || null,
      matched_device_id: result?.device_id || null,
      reason: reason.trim(),
      status: "pending_admin",
    } as any);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Claim submitted — awaiting admin approval");
    setValue(""); setReason(""); setResult(undefined);
    onClaimCreated?.();
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
        <Search size={18} /> Find a patient
      </h3>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {(["saudi_id", "passport", "iqama"] as SearchType[]).map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={`py-2 rounded-lg text-xs font-semibold transition ${type === t ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
            {t === "saudi_id" ? "Saudi ID" : t === "passport" ? "Passport" : "Iqama"}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input value={value} onChange={(e) => setValue(e.target.value)}
          placeholder={type === "saudi_id" ? "10-digit Saudi ID" : type === "passport" ? "Passport number" : "Iqama number"}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
        <button onClick={search} disabled={searching}
          className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-sm font-semibold disabled:opacity-50">
          {searching ? "…" : "Search"}
        </button>
      </div>

      {result === null && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-950/30 p-3 mb-3 flex gap-2">
          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-amber-300">No registered patient with that ID.</p>
            <p className="text-amber-200/80 mt-0.5">You can still submit the claim — admin will hold it until the patient registers.</p>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-3 mb-3">
          <p className="text-sm font-semibold text-emerald-300">Match found</p>
          <p className="text-xs mt-1"><span className="text-slate-400">Name:</span> {result.full_name_en || "—"} {result.full_name_ar && `· ${result.full_name_ar}`}</p>
          <p className="text-xs"><span className="text-slate-400">DOB:</span> {result.date_of_birth || "—"} · {result.gender || "—"} · {result.nationality || "—"}</p>
        </div>
      )}

      {(result !== undefined) && (
        <div className="space-y-2">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Clinical reason for requesting access (visible to admin and patient)"
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
          <button onClick={submitClaim} disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <UserPlus size={16} /> {submitting ? "Submitting…" : "Submit claim for approval"}
          </button>
        </div>
      )}
    </div>
  );
};

export default PatientSearch;
