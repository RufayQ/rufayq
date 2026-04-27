import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Users, CreditCard, Briefcase, Globe, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_LEAVES, type LeafKey } from "./adminNav";

interface Result {
  id: string;
  kind: "user" | "claim" | "payment" | "page" | "nav";
  title: string;
  subtitle?: string;
  leaf: LeafKey;
  payload?: any;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (leaf: LeafKey, payload?: any) => void;
}

const KIND_META: Record<Result["kind"], { label: string; icon: typeof Users; tint: string }> = {
  user:    { label: "Users",    icon: Users,     tint: "text-sky-400" },
  claim:   { label: "Claims",   icon: Briefcase, tint: "text-violet-400" },
  payment: { label: "Payments", icon: CreditCard, tint: "text-emerald-400" },
  page:    { label: "CMS Pages", icon: Globe,    tint: "text-amber-400" },
  nav:     { label: "Navigate", icon: ArrowRight, tint: "text-slate-400" },
};

const useDebounced = <T,>(value: T, ms = 220) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};

const RECENT_KEY = "admin.search.recent";
const readRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
};
const pushRecent = (term: string) => {
  const t = term.trim(); if (!t) return;
  try {
    const cur: string[] = readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase());
    cur.unshift(t);
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 6)));
  } catch { /* noop */ }
};

const GlobalSearchPalette = ({ open, onClose, onPick }: Props) => {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(q, 220);

  useEffect(() => {
    if (open) {
      setQ(""); setActive(0); setResults([]);
      setRecent(readRecent());
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Build nav results immediately (synchronous).
  const navResults: Result[] = useMemo(() => {
    if (!debounced.trim()) return [];
    const term = debounced.toLowerCase();
    return ALL_LEAVES
      .filter((l) => l.label.toLowerCase().includes(term))
      .slice(0, 5)
      .map((l) => ({ id: `nav:${l.key}`, kind: "nav" as const, title: l.label, subtitle: "Go to module", leaf: l.key }));
  }, [debounced]);

  // Async DB lookups.
  useEffect(() => {
    if (!debounced.trim()) { setResults(navResults); return; }
    let cancelled = false;
    setLoading(true);
    const term = debounced.trim();
    const like = `%${term}%`;
    (async () => {
      const safe = async <T,>(build: () => any): Promise<T[]> => {
        try { const r = await build(); return (r?.data ?? []) as T[]; } catch { return []; }
      };
      const sb: any = supabase;
      const [users, claims, payments, pages] = await Promise.all([
        safe<any>(() => sb.from("profiles").select("id,full_name,email,phone").or(`email.ilike.${like},full_name.ilike.${like},phone.ilike.${like}`).limit(5)),
        safe<any>(() => sb.from("patient_claims").select("id,patient_name,status,claim_no").or(`patient_name.ilike.${like},claim_no.ilike.${like}`).limit(5)),
        safe<any>(() => sb.from("payment_receipts").select("id,payer_name,reference_no,amount,currency").or(`payer_name.ilike.${like},reference_no.ilike.${like}`).limit(5)),
        safe<any>(() => sb.from("cms_pages").select("id,slug,title").or(`slug.ilike.${like},title.ilike.${like}`).limit(5)),
      ]);
      if (cancelled) return;
      const out: Result[] = [
        ...navResults,
        ...users.map((u: any) => ({ id: `u:${u.id}`, kind: "user" as const, title: u.full_name || u.email || "(unnamed)", subtitle: [u.email, u.phone].filter(Boolean).join(" · "), leaf: "users" as LeafKey, payload: { id: u.id } })),
        ...claims.map((c: any) => ({ id: `c:${c.id}`, kind: "claim" as const, title: c.patient_name || c.claim_no || c.id.slice(0, 8), subtitle: `Status: ${c.status}`, leaf: "claims" as LeafKey, payload: { id: c.id } })),
        ...payments.map((p: any) => ({ id: `p:${p.id}`, kind: "payment" as const, title: p.payer_name || p.reference_no || p.id.slice(0, 8), subtitle: `${p.currency || ""} ${p.amount ?? ""}`.trim(), leaf: "payments" as LeafKey, payload: { id: p.id } })),
        ...pages.map((pg: any) => ({ id: `pg:${pg.id}`, kind: "page" as const, title: pg.title || pg.slug, subtitle: `/${pg.slug}`, leaf: "website_cms" as LeafKey, payload: { id: pg.id } })),
      ];
      setResults(out);
      setActive(0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debounced, navResults]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0))); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter")     {
        e.preventDefault();
        const r = results[active];
        if (r) { pushRecent(q); onPick(r.leaf, r.payload); onClose(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, active, onClose, onPick, q]);

  if (!open) return null;

  // Group results by kind for display.
  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.kind] ||= []).push(r);
    return acc;
  }, {});

  let renderIdx = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
          <Search size={16} className="text-slate-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users, claims, payments, pages… (Esc to close)"
            className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder-slate-500"
          />
          <kbd className="text-[10px] font-mono text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {!q.trim() && (
            <div className="px-6 py-8">
              {recent.length > 0 ? (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Recent</div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {recent.map((r) => (
                      <button
                        key={r}
                        onClick={() => setQ(r)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500/40 hover:text-amber-200 transition"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <div className="text-center text-xs text-slate-500">
                Search <span className="text-slate-300">users</span>, <span className="text-slate-300">claims</span>, <span className="text-slate-300">payments</span>, and <span className="text-slate-300">CMS pages</span>.
                <div className="mt-3 flex items-center justify-center gap-2 text-[10px]">
                  <kbd className="font-mono border border-slate-700 rounded px-1.5 py-0.5">↑</kbd>
                  <kbd className="font-mono border border-slate-700 rounded px-1.5 py-0.5">↓</kbd>
                  <span>navigate</span>
                  <kbd className="ml-2 font-mono border border-slate-700 rounded px-1.5 py-0.5">↵</kbd>
                  <span>open</span>
                </div>
              </div>
            </div>
          )}
          {q.trim() && loading && results.length === 0 && (
            <div className="px-6 py-8 text-center text-xs text-slate-500">Searching…</div>
          )}
          {q.trim() && !loading && results.length === 0 && (
            <div className="px-6 py-8 text-center text-xs text-slate-500">No results for “{q}”.</div>
          )}
          {Object.entries(grouped).map(([kind, items]) => {
            const meta = KIND_META[kind as Result["kind"]];
            const Icon = meta.icon;
            return (
              <div key={kind}>
                <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-slate-500">{meta.label}</div>
                <ul>
                  {items.map((r) => {
                    renderIdx++;
                    const isActive = renderIdx === active;
                    return (
                      <li key={r.id}>
                        <button
                          onMouseEnter={() => setActive(renderIdx)}
                          onClick={() => { onPick(r.leaf, r.payload); onClose(); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${isActive ? "bg-slate-800" : "hover:bg-slate-800/60"}`}
                        >
                          <Icon size={14} className={meta.tint} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-slate-100 truncate">{r.title}</span>
                            {r.subtitle && <span className="block text-[11px] text-slate-500 truncate">{r.subtitle}</span>}
                          </span>
                          {isActive && <ArrowRight size={12} className="text-slate-500" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchPalette;
