import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, FileText, Check, X, MessageSquare, ExternalLink, Loader2, Zap, Copy } from "lucide-react";
import UniversalDocumentPreview from "@/components/records/UniversalDocumentPreview";

interface ProviderApp {
  id: string;
  created_at: string;
  status: string;
  org_name: string;
  org_name_ar: string | null;
  org_type: string;
  country: string | null;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  contact_person_name: string;
  contact_person_role: string | null;
  notes: string | null;
  agreement_url: string | null;
  registration_url: string | null;
  admin_feedback: string | null;
  reviewed_at: string | null;
  organization_id: string | null;
}

const STATUSES = ["all", "pending", "needs_info", "approved", "rejected"];
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  needs_info: "bg-blue-500/15 text-blue-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-red-500/15 text-red-300",
};

const AdminProviderApplications = () => {
  const [apps, setApps] = useState<ProviderApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<ProviderApp | null>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string; emailSent: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("provider_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setApps((data || []) as ProviderApp[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const open = (app: ProviderApp) => { setActive(app); setFeedback(app.admin_feedback || ""); };

  const update = async (status: string) => {
    if (!active) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    let organization_id = active.organization_id;

    if (status === "approved" && !organization_id) {
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          name: active.org_name,
          org_type: active.org_type as any,
          country: active.country,
          contact_email: active.contact_email,
          contact_phone: active.contact_phone,
          website: active.website,
          notes: active.notes,
          created_by: user?.id || null,
        })
        .select("id")
        .single();
      if (orgErr) { toast.error(orgErr.message); setBusy(false); return; }
      organization_id = org.id;
    }

    const { error } = await supabase
      .from("provider_applications")
      .update({
        status,
        admin_feedback: feedback.trim() || null,
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
        organization_id,
      })
      .eq("id", active.id);

    if (error) { toast.error(error.message); setBusy(false); return; }

    await supabase.rpc("log_audit_event", {
      _action: `provider_application_${status}`,
      _target_type: "provider_application",
      _target_id: active.id,
      _details: { org_name: active.org_name, organization_id },
    });

    toast.success(`Application ${status}`);
    setActive(null);
    setBusy(false);
    load();
  };

  const oneClickApprove = async () => {
    if (!active) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("approve-provider", {
      body: { application_id: active.id, admin_feedback: feedback.trim() || null },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to onboard provider");
      return;
    }
    const d = data as any;
    setCredentials({ email: active.contact_email, password: d.temp_password, emailSent: !!d.email_sent });
    toast.success(d.user_existed ? "Org linked, password reset" : "Provider onboarded");
    load();
  };

  const filtered = filter === "all" ? apps : apps.filter(a => a.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Building2 size={18} className="text-amber-400"/>Provider Applications</h2>
        <div className="flex gap-1">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize ${filter === s ? "bg-amber-500/15 text-amber-300" : "text-slate-400 hover:bg-slate-800/50"}`}>
              {s.replace("_"," ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-slate-400 text-sm">Loading…</p> : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">No applications.</p>
      ) : (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="text-left px-4 py-2.5">Organization</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Country</th>
                <th className="text-left px-4 py-2.5">Submitted</th>
                <th className="text-left px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(app => (
                <tr key={app.id} onClick={() => open(app)}
                  className="border-t border-slate-800 hover:bg-slate-900/40 cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="text-slate-100 font-medium">{app.org_name}</p>
                    <p className="text-xs text-slate-500">{app.contact_email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-300">{app.org_type}</td>
                  <td className="px-4 py-3 text-slate-300">{app.country || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${STATUS_COLOR[app.status] || "bg-slate-700 text-slate-300"}`}>
                      {app.status.replace("_"," ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4" onClick={() => setActive(null)}>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100">{active.org_name}</h3>
                {active.org_name_ar && <p className="text-xs text-slate-500" dir="rtl">{active.org_name_ar}</p>}
              </div>
              <button onClick={() => setActive(null)} className="text-slate-400 hover:text-white"><X size={18}/></button>
            </div>

            <div className="p-5 space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Info label="Type" value={active.org_type}/>
                <Info label="Country" value={active.country || "—"}/>
                <Info label="Email" value={active.contact_email}/>
                <Info label="Phone" value={active.contact_phone || "—"}/>
                <Info label="Website" value={active.website || "—"}/>
                <Info label="Contact person" value={`${active.contact_person_name}${active.contact_person_role ? " · " + active.contact_person_role : ""}`}/>
              </div>
              {active.notes && (
                <div className="rounded-lg bg-slate-900 p-3 text-xs text-slate-300">{active.notes}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <DocPreview url={active.agreement_url} label="Signed agreement"/>
                <DocPreview url={active.registration_url} label="Commercial registration"/>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1"><MessageSquare size={11}/>Admin feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Visible to internal team. Used when requesting more info or rejecting."
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-500/40"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                <button disabled={busy} onClick={oneClickApprove}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                  {busy ? <Loader2 size={12} className="animate-spin"/> : <Zap size={12}/>} Approve & onboard provider
                </button>
                <button disabled={busy} onClick={() => update("approved")}
                  className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
                  <Check size={12}/> Approve only (no auth user)
                </button>
                <button disabled={busy} onClick={() => update("needs_info")}
                  className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-semibold disabled:opacity-50">
                  Request more info
                </button>
                <button disabled={busy} onClick={() => update("rejected")}
                  className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-xs font-semibold disabled:opacity-50">
                  Reject
                </button>
                {active.organization_id && (
                  <span className="ml-auto text-[10px] text-emerald-400 self-center">✓ linked org {active.organization_id.slice(0,8)}</span>
                )}
              </div>

              {credentials && (
                <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Provider credentials</p>
                    <button onClick={() => setCredentials(null)} className="text-slate-500 hover:text-white"><X size={14}/></button>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {credentials.emailSent ? "✓ Approval email sent to provider with these credentials." : "⚠ Email infrastructure not configured — share credentials manually."}
                  </p>
                  <div className="rounded bg-slate-950/60 border border-slate-800 p-3 font-mono text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-slate-100">{credentials.email}</span>
                      <button onClick={() => { navigator.clipboard.writeText(credentials.email); toast.success("Copied"); }} className="text-amber-400 hover:text-amber-300"><Copy size={11}/></button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Password:</span>
                      <span className="text-slate-100">{credentials.password}</span>
                      <button onClick={() => { navigator.clipboard.writeText(credentials.password); toast.success("Copied"); }} className="text-amber-400 hover:text-amber-300"><Copy size={11}/></button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">Provider should change their password after first sign-in at /provider/login.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    <p className="text-slate-200 text-sm capitalize">{value}</p>
  </div>
);

const DocPreview = ({ url, label }: { url: string | null; label: string }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    // Backwards-compat: legacy rows stored full https URLs; new rows store storage paths.
    const isLegacyFullUrl = /^https?:\/\//i.test(url);
    if (isLegacyFullUrl) {
      setSignedUrl(url);
      return;
    }
    (async () => {
      const { data, error } = await supabase.storage
        .from("provider-docs")
        .createSignedUrl(url, 60 * 10); // 10 min
      if (cancelled) return;
      if (error || !data) { setLoadErr(error?.message || "Cannot load"); return; }
      setSignedUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (!url) return (
    <div className="rounded-lg border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
      <FileText size={20} className="mx-auto mb-1 opacity-50"/>{label} · not uploaded
    </div>
  );
  if (loadErr) return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center text-xs text-red-300">
      {label} · {loadErr}
    </div>
  );
  if (!signedUrl) return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-center text-xs text-slate-500">
      Loading {label}…
    </div>
  );
  const fileName = (url.split("/").pop() || label) as string;
  return (
    <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-900">
      <div className="px-3 py-2 flex items-center justify-between border-b border-slate-800">
        <span className="text-[11px] text-slate-300 font-medium">{label}</span>
        <a href={signedUrl} target="_blank" rel="noopener" className="text-amber-400 text-[11px] flex items-center gap-1">
          Open <ExternalLink size={10}/>
        </a>
      </div>
      <div className="h-56 bg-slate-950">
        <UniversalDocumentPreview
          url={signedUrl}
          fileName={fileName}
          title={label}
          className="h-full w-full bg-slate-950"
        />
      </div>
    </div>
  );
};

export default AdminProviderApplications;
