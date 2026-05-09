/**
 * RequestAccessSheet — multi-select EMR sections + optional clinical note,
 * creates a `consent_requests` row that the patient must approve before the
 * provider's EMR viewer renders the data.
 */
import { useState } from "react";
import { Lock, Send, X } from "lucide-react";
import { toast } from "sonner";
import { providerClient } from "@/api/clients/provider.client";
import type { ConsentSection } from "@/api/contracts/provider";

const SECTIONS: { id: ConsentSection; label: string; description: string }[] = [
  { id: "profile", label: "Profile", description: "Name, DOB, demographics" },
  { id: "medications", label: "Medications", description: "Current meds and history" },
  { id: "lab_results", label: "Lab results", description: "Recent labs and trends" },
  { id: "imaging", label: "Imaging / radiology", description: "Reports and images" },
  { id: "discharge_summaries", label: "Discharge summaries", description: "Past hospital stays" },
  { id: "appointments", label: "Appointments", description: "Past and upcoming visits" },
  { id: "consultations", label: "Consultations", description: "Specialist consult notes" },
];

interface Props {
  organizationId: string;
  patientDeviceId: string;
  onClose: () => void;
  onCreated?: () => void;
}

const RequestAccessSheet = ({ organizationId, patientDeviceId, onClose, onCreated }: Props) => {
  const [picked, setPicked] = useState<ConsentSection[]>(["profile", "medications", "lab_results"]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id: ConsentSection) =>
    setPicked((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  const submit = async () => {
    if (picked.length === 0) { toast.error("Pick at least one section"); return; }
    if (note.trim().length < 5) { toast.error("Add a short clinical reason (≥ 5 chars)"); return; }
    setBusy(true);
    const res = await providerClient.consentRequests.create(organizationId, patientDeviceId, picked, note.trim());
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Access request sent — patient will be notified");
    onCreated?.(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="rounded-2xl bg-slate-900 border border-amber-500/30 w-full max-w-md p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <Lock size={14} className="text-amber-400" /> Request EMR access
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Patient: <span className="font-mono">{patientDeviceId}</span></p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200"><X size={16} /></button>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-amber-400">Sections</p>
          {SECTIONS.map((s) => (
            <label key={s.id} className="flex items-start gap-2 p-2 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer">
              <input type="checkbox" checked={picked.includes(s.id)} onChange={() => toggle(s.id)}
                className="mt-0.5 accent-amber-400" />
              <div>
                <p className="text-xs text-slate-200">{s.label}</p>
                <p className="text-[10px] text-slate-500">{s.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-amber-400 mb-1">Clinical reason</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="Why do you need access? Visible to the patient."
            className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-slate-200" />
        </div>

        <button onClick={submit} disabled={busy}
          className="w-full px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
          <Send size={12} /> {busy ? "Sending…" : `Request ${picked.length} section${picked.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
};

export default RequestAccessSheet;
