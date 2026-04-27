/**
 * CmsLivePreview — lightweight side-panel preview of a CMS page that
 * re-renders the moment any of these things happen:
 *
 *   • the editor mutates a section locally (passes `sections` prop)
 *   • the page status changes (draft/published/scheduled/archived)
 *   • a realtime UPDATE/INSERT/DELETE fires on `cms_pages` or
 *     `cms_sections` (so a different editor / admin / CMS publish
 *     also re-renders this preview without a manual refresh)
 *
 * This is intentionally a structural preview — not a pixel-perfect
 * production render. Its job is to verify *what* is on the page and *in
 * what order* as you edit. The public site continues to render through
 * its existing page route.
 */
import { useEffect, useState } from "react";
import { Activity, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeChannel } from "@/api";
import { SECTION_LABELS, type CmsPage, type CmsSection, type PageStatus } from "./cmsTypes";

const STATUS_TONE: Record<PageStatus, string> = {
  draft: "bg-slate-700/50 text-slate-300",
  published: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
  scheduled: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
  archived: "bg-stone-500/20 text-stone-300",
};

interface Props {
  page: CmsPage;
  sections: CmsSection[];
  locale: "en" | "ar";
  /** Re-fetch the editor's page+sections from DB. Triggered when realtime
   *  fires from outside this editor session. */
  onExternalChange?: () => void;
}

/** Pull the most useful display strings out of an arbitrary section content blob. */
const summariseContent = (content: unknown): { title?: string; subtitle?: string; bodyPreview?: string } => {
  if (!content || typeof content !== "object") return {};
  const c = content as Record<string, unknown>;
  const pickStr = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = c[k];
      if (typeof v === "string" && v.trim()) return v;
    }
    return undefined;
  };
  const title = pickStr("title", "titleLine1", "heading", "label");
  const subtitle = pickStr("subtitle", "eyebrow", "desc", "description");
  let bodyPreview: string | undefined;
  // Cards / steps / items lists — show count
  const listKey = (["cards", "steps", "items", "faqs", "logos", "stats", "tiers"] as const).find(
    (k) => Array.isArray(c[k]),
  );
  if (listKey) {
    const arr = c[listKey] as unknown[];
    bodyPreview = `${arr.length} ${listKey}`;
  } else {
    const body = pickStr("body", "text", "html", "content");
    if (body) bodyPreview = body.slice(0, 140) + (body.length > 140 ? "…" : "");
  }
  return { title, subtitle, bodyPreview };
};

export const CmsLivePreview = ({ page, sections, locale, onExternalChange }: Props) => {
  const [lastRemoteAt, setLastRemoteAt] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);

  // Listen broadly so publishes / schedules from other editors or the CMS
  // publish flow flow into the preview.
  useRealtimeChannel<{ id: string; page_id?: string }>("cmsSectionsAny", (payload) => {
    const pageId = (payload.new?.page_id ?? payload.old?.page_id) as string | undefined;
    if (pageId !== page.id) return;
    const id = (payload.new?.id ?? payload.old?.id) as string | undefined;
    if (id) setPulseId(id);
    setLastRemoteAt(new Date().toISOString());
    onExternalChange?.();
    if (id) setTimeout(() => setPulseId((cur) => (cur === id ? null : cur)), 1500);
  });

  useRealtimeChannel<{ id: string; status?: string }>("cmsPagesAny", (payload) => {
    const id = (payload.new?.id ?? payload.old?.id) as string | undefined;
    if (id !== page.id) return;
    setLastRemoteAt(new Date().toISOString());
    onExternalChange?.();
  });

  // Defensive: if the editor doesn't pass `onExternalChange`, refetch
  // sections inline so the preview itself stays accurate.
  const [fallbackSections, setFallbackSections] = useState<CmsSection[] | null>(null);
  useEffect(() => {
    if (!lastRemoteAt || onExternalChange) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("cms_sections")
        .select("*")
        .eq("page_id", page.id)
        .order("sort_order");
      if (alive) setFallbackSections((data as unknown as CmsSection[]) ?? []);
    })();
    return () => { alive = false; };
  }, [lastRemoteAt, page.id, onExternalChange]);

  const renderSections = fallbackSections ?? sections;
  const visibleSections = renderSections.filter((s) => s.visible !== false);
  const pageTitle = locale === "ar" && page.title_ar ? page.title_ar : page.title_en;
  const pageDir = locale === "ar" ? "rtl" : "ltr";

  return (
    <aside
      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
      aria-label="Live preview"
    >
      <header className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Live preview</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
          <Activity size={10} className="text-emerald-400 animate-pulse" />live
        </span>
      </header>

      {/* Page chrome */}
      <div className="mb-3 pb-3 border-b border-slate-800 flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_TONE[page.status]}`}>{page.status}</span>
        <span className="font-mono text-[10px] text-amber-300">/{page.slug}</span>
        {page.scheduled_at && (
          <span className="text-[10px] text-sky-300">scheduled {new Date(page.scheduled_at).toLocaleString()}</span>
        )}
      </div>

      <div dir={pageDir} className="space-y-3">
        <h1 className="text-base font-bold text-white leading-tight">{pageTitle}</h1>

        {visibleSections.length === 0 && (
          <p className="text-[11px] text-slate-500 italic">No visible sections yet.</p>
        )}

        {visibleSections.map((s) => {
          const content = locale === "en" ? s.content_en : s.content_ar;
          const { title, subtitle, bodyPreview } = summariseContent(content);
          const pulse = pulseId === s.id;
          return (
            <section
              key={s.id}
              className={`rounded-lg border p-3 transition-colors ${pulse ? "border-amber-500/60 bg-amber-500/5" : "border-slate-800 bg-slate-900/40"}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-mono">
                  {SECTION_LABELS[s.type] ?? s.type}
                </span>
                <span className="text-[9px] text-slate-500">#{s.sort_order}</span>
              </div>
              {title && <p className="text-sm font-semibold text-slate-100">{title}</p>}
              {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
              {bodyPreview && <p className="text-[11px] text-slate-300 mt-1">{bodyPreview}</p>}
              {!title && !subtitle && !bodyPreview && (
                <p className="text-[11px] text-slate-500 italic">empty section</p>
              )}
            </section>
          );
        })}
      </div>

      {lastRemoteAt && (
        <p className="text-[10px] text-emerald-400/80 mt-3">
          ⚡ updated from realtime · {new Date(lastRemoteAt).toLocaleTimeString()}
        </p>
      )}
    </aside>
  );
};

export default CmsLivePreview;
