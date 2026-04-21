import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound, Shield, Copy, MessageCircle, Mail, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

type Kind = "manual_code" | "profile_activation";
type Status = "pending" | "in_progress" | "fulfilled" | "rejected";

interface Row {
  id: string;
  kind: Kind;
  status: Status;
  channel: string | null;
  recipient: string;
  full_name: string | null;
  note: string | null;
  device_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  handled_at: string | null;
}

const STATUS_BADGE: Record<Status, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  in_progress: "bg-blue-500/15 text-blue-300",
  fulfilled: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
};

type Persona = "patient" | "provider" | "unknown";

const AdminVerificationAssist = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [personaMap, setPersonaMap] = useState<Record<string, Persona>>({});
  const [filter, setFilter] = useState<"all" | "pending" | Kind>("pending");
  const [section, setSection] = useState<"patients" | "providers">("patients");
  const [loading, setLoading] = useState(false);
  const [otpModal, setOtpModal] = useState<{ recipient: string; code: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("verification_assistance_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error(error.message);
    const list = (data || []) as Row[];
    setRows(list);

    // Resolve persona by matching device_id / phone / email against profiles
    const deviceIds = Array.from(new Set(list.map(r => r.device_id).filter(Boolean))) as string[];
    const recipients = Array.from(new Set(list.map(r => r.recipient).filter(Boolean))) as string[];
    const phones = recipients.filter(r => !r.includes("@"));
    const emails = recipients.filter(r => r.includes("@"));
    const map: Record<string, Persona> = {};
    if (deviceIds.length || phones.length || emails.length) {
      // Build OR filter — profiles RLS is admin/mod readable
      const orParts: string[] = [];
      if (deviceIds.length) orParts.push(`device_id.in.(${deviceIds.map(d => `"${d}"`).join(",")})`);
      if (phones.length) orParts.push(`phone.in.(${phones.map(p => `"${p}"`).join(",")})`);
      if (emails.length) orParts.push(`email.in.(${emails.map(e => `"${e}"`).join(",")})`);
      const { data: profs } = await supabase
        .from("profiles")
        .select("device_id,phone,email,provider_type")
        .or(orParts.join(","));
      (profs || []).forEach((p: any) => {
        const persona: Persona = p.provider_type === "patient" ? "patient" : "provider";
        if (p.device_id) map[`d:${p.device_id}`] = persona;
        if (p.phone) map[`r:${p.phone}`] = persona;
        if (p.email) map[`r:${p.email.toLowerCase()}`] = persona;
      });
    }
    setPersonaMap(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const personaOf = (r: Row): Persona => {
    if (r.device_id && personaMap[`d:${r.device_id}`]) return personaMap[`d:${r.device_id}`];
    const k = r.recipient?.includes("@") ? r.recipient.toLowerCase() : r.recipient;
    if (k && personaMap[`r:${k}`]) return personaMap[`r:${k}`];
    return "unknown";
  };

  const update = async (id: string, patch: Partial<Row>) => {
    setBusyId(id);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("verification_assistance_requests")
      .update({ ...patch, handled_by: u.user?.id, handled_at: new Date().toISOString() } as never)
      .eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); load(); }
  };

  const generateCode = async (row: Row) => {
    // Allow admin to confirm/edit recipient before issuing — must EXACTLY match what the user
    // sees on their OTP screen (E.164 phone or lowercase email), otherwise consume_manual_otp won't match.
    const editedRaw = prompt(
      `Issue a 6-digit code for which recipient?\n\nMust match exactly what appears on the user's verification screen (e.g. +966569590418 or user@email.com).`,
      row.recipient,
    );
    if (!editedRaw) return;
    const recipient = editedRaw.trim().includes("@") ? editedRaw.trim().toLowerCase() : editedRaw.trim().replace(/\s+/g, "");
    setBusyId(row.id);
    const { data, error } = await supabase.rpc("admin_generate_manual_otp", { _recipient: recipient });
    if (error) { setBusyId(null); toast.error(error.message); return; }
    const r = (data as any)?.[0];
    if (!r) { setBusyId(null); toast.error("No code returned"); return; }
    setOtpModal({ recipient, code: r.code });
    await supabase
      .from("verification_assistance_requests")
      .update({ status: "fulfilled", handled_at: new Date().toISOString(), resolution_notes: `Manual code issued to ${recipient}` } as never)
      .eq("id", row.id);
    setBusyId(null);
    load();
  };

  const activateProfile = async (row: Row) => {
    if (!confirm(`Mark profile for ${row.recipient} as activated?\n\nThis flips the request to "fulfilled" — note that the user still needs a Supabase auth account to actually sign in. Use 'Create User' in the Users tab to provision one if needed.`)) return;
    update(row.id, { status: "fulfilled", resolution_notes: "Profile activation approved" } as never);
  };

  const sectionFiltered = rows.filter(r => {
    const persona = personaOf(r);
    // Patients section also catches unknown so nothing gets hidden by accident
    return section === "patients" ? persona !== "provider" : persona === "provider";
  });
  const filtered = sectionFiltered.filter(r => {
    if (filter === "all") return true;
    if (filter === "pending") return r.status === "pending" || r.status === "in_progress";
    return r.kind === filter;
  });

  const counts = {
    patients: rows.filter(r => personaOf(r) !== "provider" && (r.status === "pending" || r.status === "in_progress")).length,
    providers: rows.filter(r => personaOf(r) === "provider" && (r.status === "pending" || r.status === "in_progress")).length,
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-100">User Activations</h2>
        <p className="text-xs text-slate-500">Sign-up fallback requests — manual codes & profile activations</p>
      </div>

      {/* Persona section toggle */}
      <div className="flex gap-2 border-b border-slate-800">
        {(["patients", "providers"] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${
              section === s ? "border-amber-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}>
            {s === "patients" ? "Patients" : "Providers"}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {(["pending", "manual_code", "profile_activation", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs ${filter === f ? "bg-amber-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-300"}`}>
            {f === "pending" ? "Open" : f === "manual_code" ? "Code requests" : f === "profile_activation" ? "Activations" : "All"}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && filtered.length === 0 && <p className="text-slate-500 text-sm">No requests.</p>}

      {filtered.map(r => (
        <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.kind === "manual_code" ? "bg-teal-500/15 text-teal-300" : "bg-violet-500/15 text-violet-300"}`}>
                  {r.kind === "manual_code" ? <><KeyRound size={9} className="inline mr-1"/>Manual code</> : <><Shield size={9} className="inline mr-1"/>Profile activation</>}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                {(() => { const p = personaOf(r); return (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${p === "provider" ? "bg-blue-500/15 text-blue-300" : p === "patient" ? "bg-rose-500/15 text-rose-300" : "bg-slate-700 text-slate-400"}`}>{p}</span>
                ); })()}
                {r.channel && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{r.channel}</span>}
              </div>
              <p className="text-sm text-slate-100 font-mono break-all">{r.recipient}</p>
              {r.full_name && <p className="text-xs text-slate-400 mt-0.5">{r.full_name}</p>}
              {r.note && <p className="text-xs text-slate-300 mt-1 italic">"{r.note}"</p>}
              <p className="text-[10px] text-slate-600 mt-1">
                <Clock size={9} className="inline mr-1"/>{new Date(r.created_at).toLocaleString()}
                {r.device_id && <span> · device {r.device_id.slice(0, 16)}…</span>}
              </p>
              {r.resolution_notes && <p className="text-[11px] text-emerald-300 mt-1">→ {r.resolution_notes}</p>}
            </div>
          </div>

          {(r.status === "pending" || r.status === "in_progress") && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
              {r.kind === "manual_code" ? (
                <button onClick={() => generateCode(r)} disabled={busyId === r.id}
                  className="px-3 py-1.5 rounded bg-amber-500/15 text-amber-300 text-xs font-semibold flex items-center gap-1 disabled:opacity-50">
                  {busyId === r.id ? <Loader2 size={11} className="animate-spin"/> : <KeyRound size={11}/>}
                  Generate OTP
                </button>
              ) : (
                <button onClick={() => activateProfile(r)} disabled={busyId === r.id}
                  className="px-3 py-1.5 rounded bg-violet-500/15 text-violet-300 text-xs font-semibold flex items-center gap-1 disabled:opacity-50">
                  {busyId === r.id ? <Loader2 size={11} className="animate-spin"/> : <Shield size={11}/>}
                  Approve activation
                </button>
              )}
              {r.status === "pending" && (
                <button onClick={() => update(r.id, { status: "in_progress" } as never)} disabled={busyId === r.id}
                  className="px-3 py-1.5 rounded bg-blue-500/15 text-blue-300 text-xs flex items-center gap-1 disabled:opacity-50">
                  <Clock size={11}/> Mark in progress
                </button>
              )}
              <div className="flex-1"/>
              <button onClick={() => {
                const reason = prompt("Rejection reason?") || "Rejected";
                update(r.id, { status: "rejected", resolution_notes: reason } as never);
              }} disabled={busyId === r.id}
                className="px-3 py-1.5 rounded bg-rose-500/15 text-rose-300 text-xs flex items-center gap-1 disabled:opacity-50">
                <XCircle size={11}/> Reject
              </button>
            </div>
          )}
        </div>
      ))}

      {otpModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6" onClick={() => setOtpModal(null)}>
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-amber-300 mb-1 flex items-center gap-2"><KeyRound size={18}/>Manual OTP code</h3>
            <p className="text-xs text-slate-400 mb-4">For: <span className="text-slate-200 font-mono break-all">{otpModal.recipient}</span></p>
            <div className="bg-slate-950 border border-slate-700 rounded-xl py-6 text-center mb-3">
              <p className="text-4xl font-mono font-bold tracking-[0.4em] text-amber-300">{otpModal.code}</p>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              Expires in 15 minutes. Share via WhatsApp / SMS / email. The user enters it on their verification screen.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { navigator.clipboard.writeText(otpModal.code); toast.success("Copied"); }}
                className="py-2 rounded-lg bg-slate-700 text-slate-200 text-xs flex items-center justify-center gap-1"><Copy size={12}/>Copy</button>
              <a href={`https://wa.me/${otpModal.recipient.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Your RufayQ verification code: ${otpModal.code}`)}`}
                target="_blank" rel="noreferrer"
                className="py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs flex items-center justify-center gap-1"><MessageCircle size={12}/>WhatsApp</a>
              <a href={otpModal.recipient.includes("@") ? `mailto:${otpModal.recipient}?subject=RufayQ%20code&body=Your%20code:%20${otpModal.code}` : "#"}
                className="py-2 rounded-lg bg-blue-500/20 text-blue-300 text-xs flex items-center justify-center gap-1"><Mail size={12}/>Email</a>
            </div>
            <button onClick={() => setOtpModal(null)} className="w-full mt-3 py-2 text-xs text-slate-400">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerificationAssist;
