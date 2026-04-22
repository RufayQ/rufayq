/**
 * Dev/QA route at /sitemap-preview that fetches /sitemap.xml from the running
 * origin and renders all hreflang EN/AR pairs in a readable table.
 *
 * Lets non-engineers verify that new news articles ship in the sitemap with
 * the correct alternates (en, ar, x-default) without opening DevTools.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";

interface SitemapEntry {
  loc: string;
  enAlt?: string;
  arAlt?: string;
  xDefault?: string;
  lastmod?: string;
}

const parseSitemap = (xml: string): SitemapEntry[] => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) return [];
  const urls = Array.from(doc.getElementsByTagName("url"));
  return urls.map((url) => {
    const loc = url.getElementsByTagName("loc")[0]?.textContent ?? "";
    const lastmod = url.getElementsByTagName("lastmod")[0]?.textContent ?? undefined;
    const alts = Array.from(url.getElementsByTagName("xhtml:link"));
    const findAlt = (lang: string) =>
      alts.find((l) => l.getAttribute("hreflang") === lang)?.getAttribute("href") ?? undefined;
    return {
      loc,
      lastmod,
      enAlt: findAlt("en") ?? findAlt("en-SA"),
      arAlt: findAlt("ar") ?? findAlt("ar-SA"),
      xDefault: findAlt("x-default"),
    };
  });
};

const SitemapPreview = () => {
  const [entries, setEntries] = useState<SitemapEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSitemap = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/sitemap.xml", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const parsed = parseSitemap(xml);
      if (parsed.length === 0) throw new Error("Sitemap parsed but contains no URLs");
      setEntries(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch sitemap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSitemap(); }, []);

  const newsEntries = entries?.filter((e) => e.loc.includes("/news")) ?? [];
  const otherEntries = entries?.filter((e) => !e.loc.includes("/news")) ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-mono tracking-[0.3em] text-amber-400 mb-1">DEV · SEO QA</p>
            <h1 className="text-2xl font-semibold">Sitemap Preview</h1>
            <p className="text-sm text-slate-500 mt-1">
              Fetched from <code className="text-amber-400">/sitemap.xml</code> · validates hreflang EN ↔ AR pairs
            </p>
          </div>
          <button
            onClick={fetchSitemap}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500 text-slate-950 text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Reload
          </button>
        </div>

        {loading && <p className="text-slate-500 text-sm">Loading sitemap…</p>}

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Could not load sitemap.xml</p>
              <p className="text-rose-400/80 text-xs mt-1">{error}</p>
              <p className="text-xs mt-2 text-slate-400">
                The sitemap is generated at build time. In dev preview it may be stale or missing —
                ship a production build to populate it.
              </p>
            </div>
          </div>
        )}

        {entries && (
          <>
            <Section title={`News articles (${newsEntries.length})`} entries={newsEntries} highlight />
            <Section title={`Other routes (${otherEntries.length})`} entries={otherEntries} />
          </>
        )}

        <Link to="/admin" className="inline-block mt-8 text-xs text-amber-400 hover:underline">
          ← Back to admin
        </Link>
      </div>
    </div>
  );
};

const Section = ({ title, entries, highlight }: { title: string; entries: SitemapEntry[]; highlight?: boolean }) => {
  if (entries.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className={`text-sm font-semibold mb-3 ${highlight ? "text-amber-300" : "text-slate-300"}`}>{title}</h2>
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-900 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left p-2.5 font-medium">URL</th>
              <th className="text-left p-2.5 font-medium">EN alt</th>
              <th className="text-left p-2.5 font-medium">AR alt</th>
              <th className="text-left p-2.5 font-medium">x-default</th>
              <th className="text-left p-2.5 font-medium w-20">Pair OK</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const pairOk = !!(e.enAlt && e.arAlt && e.xDefault);
              return (
                <tr key={i} className="border-t border-slate-800 hover:bg-slate-900/50">
                  <td className="p-2.5">
                    <a href={e.loc} target="_blank" rel="noreferrer" className="text-slate-200 hover:text-amber-300 inline-flex items-center gap-1">
                      <span className="truncate max-w-[260px] inline-block">{e.loc.replace(/^https?:\/\/[^/]+/, "")}</span>
                      <ExternalLink size={10} className="opacity-50" />
                    </a>
                  </td>
                  <td className="p-2.5 text-slate-500 font-mono text-[10px] truncate max-w-[160px]">{e.enAlt?.replace(/^https?:\/\/[^/]+/, "") ?? "—"}</td>
                  <td className="p-2.5 text-slate-500 font-mono text-[10px] truncate max-w-[160px]">{e.arAlt?.replace(/^https?:\/\/[^/]+/, "") ?? "—"}</td>
                  <td className="p-2.5 text-slate-500 font-mono text-[10px] truncate max-w-[160px]">{e.xDefault?.replace(/^https?:\/\/[^/]+/, "") ?? "—"}</td>
                  <td className="p-2.5">
                    {pairOk ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 size={11} /> Yes</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400"><AlertCircle size={11} /> No</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default SitemapPreview;
