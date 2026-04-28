import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2, Plus, Save, X, Search, Filter, Eye, Pencil, Pause, Play, Upload,
  Users, Package, History, FileText, Trash2, ExternalLink, Hash, Mail, Phone, Globe2, MapPin,
  RefreshCw, Receipt, Download, ShieldCheck, Send,
} from "lucide-react";
import CountrySelect from "./CountrySelect";
import CitySelect from "./CitySelect";
import { COUNTRIES } from "@/data/countries";

interface Org {
  id: string; name: string; org_type: string;
  contact_email: string | null; contact_phone: string | null;
  country: string | null; city: string | null; website: string | null; notes: string | null;
  status: string; org_code: string | null; seq_no: number;
  contract_url: string | null; contract_filename: string | null; contract_uploaded_at: string | null;
  created_at: string;
}

const TYPES = ["hospital", "clinic", "vendor", "insurance", "patient_org", "other"] as const;
const STATUSES = ["active", "suspended", "pending", "archived"] as const;
const PLANS = ["basic", "pro", "enterprise"] as const;
const CYCLES = ["monthly", "yearly"] as const;

const statusBadge = (s: string) => {
  switch (s) {
    case "active": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "suspended": return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "pending": return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    default: return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
};

const AdminOrganizations = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Org>>({ org_type: "hospital", country: "Saudi Arabia", status: "active" });
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [active, setActive] = useState<Org | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "subscription" | "employees" | "contract" | "history">("overview");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("organizations").select("*").order("seq_no", { ascending: true });
    if (error) toast.error(error.message);
    setOrgs((data as Org[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Auto-refresh on tab focus / window visibility — keeps list and subscriptions current.
  useEffect(() => {
    const onFocus = () => load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgs.filter((o) => {
      if (filterType && o.org_type !== filterType) return false;
      if (filterCountry && o.country !== filterCountry) return false;
      if (filterStatus && o.status !== filterStatus) return false;
      if (!q) return true;
      return [o.name, o.org_code, o.contact_email, o.contact_phone, o.country, o.city]
        .some((f) => f && f.toLowerCase().includes(q));
    });
  }, [orgs, search, filterType, filterCountry, filterStatus]);

  const create = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    const { data, error } = await supabase.from("organizations").insert({
      name: form.name, org_type: (form.org_type as any) || "other",
      contact_email: form.contact_email || null, contact_phone: form.contact_phone || null,
      country: form.country || null, city: form.city || null,
      website: form.website || null, notes: form.notes || null, status: form.status || "active",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", {
      _action: "organization_created", _target_type: "organization",
      _target_id: data?.id, _details: { name: form.name, org_type: form.org_type, code: data?.org_code },
    });
    toast.success("Organization created");
    setCreating(false);
    setForm({ org_type: "hospital", country: "Saudi Arabia", status: "active" });
    load();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ORG-ID, email, phone, country…"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500"
            />
          </div>
          <button
            onClick={load} disabled={loading}
            className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh organizations"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => setCreating(!creating)}
            className="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-amber-400 transition"
          >
            <Plus size={14} /> New organization
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={13} className="text-slate-500" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            <option value="">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <CountrySelect value={filterCountry} onChange={setFilterCountry} includeAll className="text-xs py-1.5" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-500">{filtered.length} of {orgs.length} shown</span>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Organization name *"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 col-span-2" />
            <select value={form.org_type} onChange={(e) => setForm({ ...form, org_type: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <CountrySelect value={form.country} onChange={(v) => setForm({ ...form, country: v, city: "" })} className="py-2 rounded-lg" />
            <CitySelect country={form.country} value={form.city} onChange={(v) => setForm({ ...form, city: v })} className="py-2 rounded-lg w-full" />
            <input value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="Contact email"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200" />
            <input value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="Phone"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200" />
            <input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 col-span-2" />
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 col-span-2" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs flex items-center gap-1">
              <X size={12} />Cancel
            </button>
            <button onClick={create} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold flex items-center gap-1">
              <Save size={12} />Save
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500 text-sm">
          No organizations match the current filters.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((o, idx) => {
          const openOn = (tab: typeof activeTab) => (e: React.MouseEvent) => {
            e.stopPropagation();
            setActiveTab(tab);
            setActive(o);
          };
          const location = [o.city, o.country].filter(Boolean).join(", ");
          return (
            <article
              key={o.id}
              role="button"
              tabIndex={0}
              onClick={() => { setActiveTab("overview"); setActive(o); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveTab("overview"); setActive(o); } }}
              className="group rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-4 hover:border-amber-500/40 hover:bg-slate-900/60 transition shadow-sm cursor-pointer focus:outline-none focus:border-amber-500/60"
            >
              <div className="flex items-start gap-4">
                {/* Numbering */}
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-300 shrink-0">
                  #{idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 size={15} className="text-amber-400 shrink-0" />
                        <h3 className="font-semibold text-base text-slate-100 truncate">{o.name}</h3>
                        {location && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-slate-800/70 border border-slate-700 px-2 py-0.5 rounded-full">
                            <MapPin size={10} className="text-slate-500" />{location}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 capitalize">{o.org_type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${statusBadge(o.status)}`}>{o.status}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-slate-400">
                        <Hash size={11} className="text-slate-500" />
                        <span className="select-all">{o.org_code || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><Mail size={11} className="text-slate-500" />{o.contact_email || "—"}</span>
                    <span className="flex items-center gap-1.5"><Phone size={11} className="text-slate-500" />{o.contact_phone || "—"}</span>
                    <span className="flex items-center gap-1.5">
                      <Globe2 size={11} className="text-slate-500" />
                      {o.website ? <a href={o.website} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-amber-300 hover:underline truncate">{o.website}</a> : "—"}
                    </span>
                  </div>

                  {/* Quick actions (each opens the drawer on its tab) */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button onClick={openOn("overview")} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1">
                      <Eye size={11} /> View
                    </button>
                    <button onClick={openOn("overview")} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1">
                      <Pencil size={11} /> Edit
                    </button>
                    <button onClick={openOn("subscription")} className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 text-[11px] flex items-center gap-1">
                      <Package size={11} /> Subscription
                    </button>
                    <button onClick={openOn("employees")} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 text-[11px] flex items-center gap-1">
                      <Users size={11} /> Employees
                    </button>
                    <button onClick={openOn("contract")} className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 text-[11px] flex items-center gap-1">
                      <Upload size={11} /> Contract
                    </button>
                    <button onClick={openOn("history")} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1">
                      <History size={11} /> History
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {active && <OrgDrawer org={active} initialTab={activeTab} onClose={() => { setActive(null); load(); }} />}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Organization side drawer                                                    */
/* -------------------------------------------------------------------------- */
type Tab = "overview" | "subscription" | "employees" | "contract" | "history";

const OrgDrawer = ({ org, initialTab = "overview", onClose }: { org: Org; initialTab?: Tab; onClose: () => void }) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => { setTab(initialTab); }, [initialTab, org.id]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Org>(org);

  useEffect(() => { setForm(org); }, [org.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const { error } = await supabase.from("organizations").update({
      name: form.name, org_type: form.org_type as any, contact_email: form.contact_email,
      contact_phone: form.contact_phone, country: form.country, city: form.city,
      website: form.website, notes: form.notes, status: form.status,
    }).eq("id", org.id);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", {
      _action: "organization_updated", _target_type: "organization",
      _target_id: org.id, _details: { name: form.name, status: form.status },
    });
    toast.success("Saved"); setEditing(false);
  };

  const toggleStatus = async (next: string) => {
    const { error } = await supabase.from("organizations").update({ status: next }).eq("id", org.id);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", {
      _action: `organization_${next}`, _target_type: "organization", _target_id: org.id,
      _details: { name: org.name, previous_status: form.status },
    });
    setForm({ ...form, status: next });
    toast.success(`Marked ${next}`);
  };

  const remove = async () => {
    if (!confirm(`Delete ${org.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("organizations").delete().eq("id", org.id);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", {
      _action: "organization_deleted", _target_type: "organization", _target_id: org.id, _details: { name: org.name },
    });
    toast.success("Deleted"); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-xl bg-slate-950 border-l border-slate-800 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-amber-400" />
                <h2 className="font-semibold text-slate-100 truncate">{org.name}</h2>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">{org.org_code}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
              <X size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${statusBadge(form.status)}`}>{form.status}</span>
            {form.status !== "suspended" ? (
              <button onClick={() => toggleStatus("suspended")} className="text-[11px] px-2 py-1 rounded-lg bg-rose-500/15 text-rose-300 flex items-center gap-1">
                <Pause size={11} /> Suspend
              </button>
            ) : (
              <button onClick={() => toggleStatus("active")} className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center gap-1">
                <Play size={11} /> Activate
              </button>
            )}
            <button onClick={remove} className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/15 hover:text-rose-300 text-slate-400 flex items-center gap-1 ml-auto">
              <Trash2 size={11} /> Delete
            </button>
          </div>
          <nav className="flex gap-1 text-[11px] overflow-x-auto -mb-1">
            {([
              ["overview", "Overview", Eye],
              ["subscription", "Subscription", Package],
              ["employees", "Employees", Users],
              ["contract", "Contract", FileText],
              ["history", "History", History],
            ] as [Tab, string, any][]).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 whitespace-nowrap transition ${
                  tab === k ? "bg-amber-500 text-slate-950 font-semibold" : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
                }`}>
                <Icon size={11} /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {tab === "overview" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details</h3>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1">
                    <Pencil size={11} /> Edit
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => { setEditing(false); setForm(org); }} className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Cancel</button>
                    <button onClick={save} className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 font-semibold flex items-center gap-1"><Save size={11} /> Save</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Name" value={form.name} editing={editing} onChange={(v) => setForm({ ...form, name: v })} colSpan />
                <SelectField label="Type" value={form.org_type} options={TYPES as any} editing={editing} onChange={(v) => setForm({ ...form, org_type: v })} />
                <SelectField label="Status" value={form.status} options={STATUSES as any} editing={editing} onChange={(v) => setForm({ ...form, status: v })} />
                <CountryField label="Country" value={form.country} editing={editing} onChange={(v) => setForm({ ...form, country: v, city: "" })} />
                <CityField label="City" country={form.country} value={form.city || ""} editing={editing} onChange={(v) => setForm({ ...form, city: v })} />
                <Field label="Email" value={form.contact_email || ""} editing={editing} onChange={(v) => setForm({ ...form, contact_email: v })} />
                <Field label="Phone" value={form.contact_phone || ""} editing={editing} onChange={(v) => setForm({ ...form, contact_phone: v })} />
                <Field label="Website" value={form.website || ""} editing={editing} onChange={(v) => setForm({ ...form, website: v })} colSpan />
                <Field label="Notes" value={form.notes || ""} editing={editing} onChange={(v) => setForm({ ...form, notes: v })} colSpan textarea />
              </div>
            </div>
          )}
          {tab === "subscription" && <SubscriptionTab orgId={org.id} />}
          {tab === "employees" && <EmployeesTab orgId={org.id} />}
          {tab === "contract" && <ContractTab org={org} />}
          {tab === "history" && <HistoryTab orgId={org.id} />}
        </div>
      </aside>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Field helpers                                                               */
/* -------------------------------------------------------------------------- */
const Field = ({ label, value, editing, onChange, colSpan, textarea }: any) => (
  <label className={`block ${colSpan ? "col-span-2" : ""}`}>
    <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    {editing ? (
      textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200" />
      )
    ) : (
      <p className="mt-1 text-sm text-slate-200 break-words">{value || "—"}</p>
    )}
  </label>
);

const SelectField = ({ label, value, options, editing, onChange }: any) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    {editing ? (
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200">
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : <p className="mt-1 text-sm text-slate-200 capitalize">{value || "—"}</p>}
  </label>
);

const CountryField = ({ label, value, editing, onChange }: any) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    {editing ? (
      <CountrySelect value={value} onChange={onChange} className="mt-1 w-full rounded-lg" />
    ) : <p className="mt-1 text-sm text-slate-200">{value || "—"}</p>}
  </label>
);

const CityField = ({ label, country, value, editing, onChange }: any) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    {editing ? (
      <div className="mt-1"><CitySelect country={country} value={value} onChange={onChange} className="w-full rounded-lg" /></div>
    ) : <p className="mt-1 text-sm text-slate-200">{value || "—"}</p>}
  </label>
);

/* -------------------------------------------------------------------------- */
/* Subscription tab                                                            */
/* -------------------------------------------------------------------------- */
const SubscriptionTab = ({ orgId }: { orgId: string }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<any>({ plan: "pro", billing_cycle: "monthly", seats: 5, amount: 0, currency: "SAR", status: "active" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("organization_subscriptions").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [orgId]); // eslint-disable-line

  const assign = async () => {
    const { error } = await supabase.from("organization_subscriptions").insert({ ...form, organization_id: orgId });
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", {
      _action: "org_subscription_assigned", _target_type: "organization", _target_id: orgId,
      _details: { plan: form.plan, cycle: form.billing_cycle, seats: form.seats, amount: form.amount },
    });
    toast.success("Subscription assigned"); setAdding(false); load();
  };

  const setStatus = async (id: string, next: string) => {
    const { error } = await supabase.from("organization_subscriptions").update({ status: next }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", {
      _action: `org_subscription_${next}`, _target_type: "organization", _target_id: orgId,
      _details: { sub_id: id, status: next },
    });
    toast.success(`Subscription ${next}`); load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active packages</h3>
        <button onClick={() => setAdding(!adding)} className="text-[11px] px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold flex items-center gap-1">
          <Plus size={11} /> Assign
        </button>
      </div>
      {adding && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 grid grid-cols-2 gap-2">
          <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            {CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: +e.target.value })} placeholder="Seats"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" />
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} placeholder="Amount"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" />
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            {["SAR","USD","AED","EUR","GBP"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" onChange={(e) => setForm({ ...form, ends_at: e.target.value || null })}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200" />
          <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 col-span-2" />
          <div className="col-span-2 flex justify-end gap-1.5">
            <button onClick={() => setAdding(false)} className="text-[11px] px-2 py-1 rounded bg-slate-700 text-slate-300">Cancel</button>
            <button onClick={assign} className="text-[11px] px-2 py-1 rounded bg-emerald-500 text-slate-950 font-semibold">Assign</button>
          </div>
        </div>
      )}
      {loading && <p className="text-slate-400 text-xs">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-slate-500 text-xs">No subscriptions assigned yet.</p>}

      {items.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">Plan history</p>
          <div className="space-y-2">
            {items.map((s) => {
              const tone = s.status === "active" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : s.status === "suspended" ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : s.status === "cancelled" ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                : "bg-slate-500/15 text-slate-300 border-slate-500/30";
              return (
                <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-100 font-semibold capitalize">{s.plan} · {s.billing_cycle}</p>
                      <p className="text-xs text-slate-400">
                        {s.amount} {s.currency} · {s.seats} seats
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Started {new Date(s.starts_at || s.created_at).toLocaleDateString()}
                        {s.ends_at && ` · ends ${new Date(s.ends_at).toLocaleDateString()}`}
                      </p>
                      {s.notes && <p className="text-[11px] text-slate-400 italic mt-1">"{s.notes}"</p>}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${tone}`}>{s.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-800">
                    {s.status !== "active" && (
                      <button onClick={() => setStatus(s.id, "active")}
                        className="text-[11px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-300">Activate</button>
                    )}
                    {s.status === "active" && (
                      <button onClick={() => setStatus(s.id, "suspended")}
                        className="text-[11px] px-2 py-1 rounded bg-amber-500/15 text-amber-300">Suspend</button>
                    )}
                    {s.status !== "cancelled" && (
                      <button onClick={() => setStatus(s.id, "cancelled")}
                        className="text-[11px] px-2 py-1 rounded bg-rose-500/15 text-rose-300">Cancel</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Employees tab — manages provider_members for the organization              */
/* -------------------------------------------------------------------------- */
const EmployeesTab = ({ orgId }: { orgId: string }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ user_id: "", member_role: "staff" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("provider_members").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setMembers(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [orgId]); // eslint-disable-line

  const add = async () => {
    if (!form.user_id) { toast.error("User ID is required (auth user UUID)"); return; }
    const { error } = await supabase.from("provider_members").insert({
      organization_id: orgId, user_id: form.user_id, member_role: form.member_role, is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", {
      _action: "org_employee_added", _target_type: "organization", _target_id: orgId,
      _details: { user_id: form.user_id, role: form.member_role },
    });
    toast.success("Employee added"); setAdding(false); setForm({ user_id: "", member_role: "staff" }); load();
  };

  const toggle = async (m: any) => {
    const { error } = await supabase.from("provider_members").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_audit_event", {
      _action: m.is_active ? "org_employee_deactivated" : "org_employee_activated",
      _target_type: "organization", _target_id: orgId, _details: { user_id: m.user_id },
    });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employees</h3>
        <button onClick={() => setAdding(!adding)} className="text-[11px] px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold flex items-center gap-1">
          <Plus size={11} /> Add
        </button>
      </div>
      {adding && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} placeholder="User UUID (auth.users.id)"
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono" />
          <select value={form.member_role} onChange={(e) => setForm({ ...form, member_role: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200">
            {["owner", "admin", "manager", "staff", "viewer"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="flex justify-end gap-1.5">
            <button onClick={() => setAdding(false)} className="text-[11px] px-2 py-1 rounded bg-slate-700 text-slate-300">Cancel</button>
            <button onClick={add} className="text-[11px] px-2 py-1 rounded bg-emerald-500 text-slate-950 font-semibold">Add</button>
          </div>
        </div>
      )}
      {loading && <p className="text-slate-400 text-xs">Loading…</p>}
      {!loading && members.length === 0 && <p className="text-slate-500 text-xs">No employees yet.</p>}
      {members.map((m) => (
        <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-mono text-slate-300 truncate">{m.user_id}</p>
            <p className="text-[11px] text-slate-500 capitalize">{m.member_role} · {m.is_active ? "active" : "inactive"}</p>
          </div>
          <button onClick={() => toggle(m)}
            className={`text-[11px] px-2 py-1 rounded ${m.is_active ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>
            {m.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Contract tab — uploads to org-contracts storage                            */
/* -------------------------------------------------------------------------- */
const ContractTab = ({ org }: { org: Org }) => {
  const [busy, setBusy] = useState(false);
  const [contract, setContract] = useState<{ url: string | null; filename: string | null; uploaded_at: string | null }>({
    url: org.contract_url, filename: org.contract_filename, uploaded_at: org.contract_uploaded_at,
  });
  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!contract.url) return;
      const { data } = await supabase.storage.from("org-contracts").createSignedUrl(contract.url, 60 * 10);
      setSigned(data?.signedUrl || null);
    })();
  }, [contract.url]);

  const upload = async (file: File) => {
    setBusy(true);
    const path = `${org.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("org-contracts").upload(path, file, { upsert: false });
    if (upErr) { toast.error(upErr.message); setBusy(false); return; }
    const { error: dbErr } = await supabase.from("organizations").update({
      contract_url: path, contract_filename: file.name, contract_uploaded_at: new Date().toISOString(),
    }).eq("id", org.id);
    if (dbErr) { toast.error(dbErr.message); setBusy(false); return; }
    await supabase.rpc("log_audit_event", {
      _action: "org_contract_uploaded", _target_type: "organization", _target_id: org.id,
      _details: { filename: file.name, size: file.size },
    });
    setContract({ url: path, filename: file.name, uploaded_at: new Date().toISOString() });
    toast.success("Contract uploaded"); setBusy(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contract & agreement</h3>
      {contract.url ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-100 truncate flex items-center gap-2"><FileText size={13} className="text-amber-300" />{contract.filename}</p>
            {contract.uploaded_at && <p className="text-[11px] text-slate-500">Uploaded {new Date(contract.uploaded_at).toLocaleString()}</p>}
          </div>
          {signed && (
            <a href={signed} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1 rounded bg-amber-500/15 text-amber-300 flex items-center gap-1">
              <ExternalLink size={11} /> Open
            </a>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No contract uploaded yet.</p>
      )}
      <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 cursor-pointer hover:border-amber-500/40">
        <Upload size={14} className="text-amber-300" />
        <span className="text-xs text-slate-300">{busy ? "Uploading…" : (contract.url ? "Replace contract (PDF / DOCX / Image)" : "Upload contract (PDF / DOCX / Image)")}</span>
        <input type="file" hidden accept=".pdf,.doc,.docx,image/*" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </label>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* History tab — pulls related entries from admin_audit_log                   */
/* -------------------------------------------------------------------------- */
const HistoryTab = ({ orgId }: { orgId: string }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .eq("target_type", "organization")
        .eq("target_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) toast.error(error.message);
      setLogs(data || []); setLoading(false);
    })();
  }, [orgId]);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin activity log</h3>
      {loading && <p className="text-slate-400 text-xs">Loading…</p>}
      {!loading && logs.length === 0 && <p className="text-slate-500 text-xs">No activity yet.</p>}
      {logs.map((l) => (
        <div key={l.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-200 font-medium">{l.action}</p>
            <span className="text-[10px] text-slate-500">{new Date(l.created_at).toLocaleString()}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{l.actor_email || l.actor_id?.slice(0, 8) || "system"} · {l.actor_role || "—"}</p>
          {l.details && <pre className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap break-words font-mono">{JSON.stringify(l.details, null, 0)}</pre>}
        </div>
      ))}
    </div>
  );
};

export default AdminOrganizations;
