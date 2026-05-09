/**
 * Doctor-side EMR viewer. Renders one card per consent section. Locked
 * sections show a "Request access" button that creates a consent_request.
 */
import { useEffect, useState } from "react";
import { Lock, FileText, Pill, FlaskConical, Activity, Calendar, MessagesSquare, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { providerClient } from "@/api/clients/provider.client";
import type { ConsentSection, EmrFetchResponse } from "@/api/contracts/provider";

const ICONS: Record<ConsentSection, any> = {
  profile: FileText, medications: Pill, lab_results: FlaskConical, imaging: ImageIcon,
  discharge_summaries: Activity, appointments: Calendar, consultations: MessagesSquare,
};
const LABELS: Record<ConsentSection, string> = {
  profile: "Profile", medications: "Medications", lab_results: "Lab results",
  imaging: "Imaging", discharge_summaries: "Discharge summaries",
  appointments: "Appointments", consultations: "Consultations",
};

interface Props { orgId: string; patientDeviceId: string; }

const ProviderEmrViewer = ({ orgId, patientDeviceId }: Props) => {
  const [emr, setEmr] = useState<EmrFetchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await providerClient.emr.fetchForPatient(orgId, patientDeviceId);
    setLoading(false);
    if (r.error) { toast.error(r.error.message); return; }
    setEmr(r.data);
  };

  useEffect(() => { load(); }, [orgId, patientDeviceId]);

  const requestAccess = async (section: ConsentSection) => {
    setRequesting(section);
    const r = await providerClient.consentRequests.create(orgId, patientDeviceId, [section]);
    setRequesting(null);
    if (r.error) toast.error(r.error.message);
    else toast.success("Access request sent — patient will be notified");
  };

  if (loading) return <div className="flex items-center justify-center py-10 opacity-60"><Loader2 className="animate-spin" size={20} /></div>;
  if (!emr) return <p className="text-sm opacity-60">No EMR data.</p>;

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {emr.sections.map((s: any) => {
        const Icon = ICONS[s.section as ConsentSection] ?? FileText;
        if (!s.granted) {
          return (
            <div key={s.section} className="p-4 rounded-xl border border-slate-700 bg-slate-900/40">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold flex items-center gap-2"><Lock size={14} /> {LABELS[s.section as ConsentSection]}</p>
              </div>
              <p className="text-xs opacity-60 mb-3">Patient consent required</p>
              <button onClick={() => requestAccess(s.section)} disabled={requesting === s.section}
                className="text-xs px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 font-semibold disabled:opacity-50">
                {requesting === s.section ? "Sending…" : "Request access"}
              </button>
            </div>
          );
        }
        return (
          <div key={s.section} className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <p className="text-sm font-semibold flex items-center gap-2 mb-3"><Icon size={14} /> {LABELS[s.section as ConsentSection]}</p>
            <pre className="text-[11px] opacity-70 whitespace-pre-wrap break-words max-h-48 overflow-auto">
              {JSON.stringify(s.data, null, 2)}
            </pre>
          </div>
        );
      })}
    </div>
  );
};

export default ProviderEmrViewer;
