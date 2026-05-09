/**
 * Inline appeal form rendered on a denied claim's denial row. Submits via
 * providerClient.claim.appeal — gated by provider.rcm.denial.appeal.raise.
 */
import { useState } from "react";
import { Gavel } from "lucide-react";
import { toast } from "sonner";
import { providerClient } from "@/api/clients/provider.client";
import { validateAppeal, fieldErrorMap } from "@/lib/providerValidation";
import Can from "@/components/auth/Can";

interface Props { denialId: string; onAppealed?: () => void }

const DenialAppealForm = ({ denialId, onAppealed }: Props) => {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const submit = async () => {
    const issues = validateAppeal({ appeal_note: note });
    const map = fieldErrorMap(issues);
    setErrs(map);
    if (issues.some((i) => i.level === "error")) return;
    setBusy(true);
    const res = await providerClient.claim.appeal(denialId, { appeal_note: note });
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Appeal raised");
    setOpen(false); setNote(""); setErrs({});
    onAppealed?.();
  };

  return (
    <Can action="provider.rcm.denial.appeal.raise">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-[10px] text-violet-300 mt-1 flex items-center gap-1">
          <Gavel size={10} /> Raise appeal
        </button>
      ) : (
        <div className="mt-1 space-y-1">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder="Appeal justification (1–1000 chars)"
            className="w-full px-2 py-1 rounded text-[11px] bg-slate-900 border border-slate-700 text-slate-100" />
          {errs.appeal_note && <p className="text-[10px] text-rose-400">{errs.appeal_note}</p>}
          <div className="flex gap-1.5">
            <button onClick={submit} disabled={busy} className="px-2 py-1 rounded bg-violet-500 text-white text-[10px] font-semibold disabled:opacity-50">
              {busy ? "…" : "Submit appeal"}
            </button>
            <button onClick={() => { setOpen(false); setErrs({}); }} className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px]">Cancel</button>
          </div>
        </div>
      )}
    </Can>
  );
};

export default DenialAppealForm;
