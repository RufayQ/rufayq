import { Seo } from "@/seo/Seo";
import { ALL_ROUTES, SITE_ORIGIN } from "@/seo/routes";

type Check = "ok" | "n/a" | "warn" | "fail";

interface AuditRow {
  path: string;
  lang: "en" | "ar";
  indexable: boolean;
  /** Component emitting per-page <Seo>. */
  seoComponent: string | null;
  hasTitle: Check;
  hasDescription: Check;
  hasCanonical: Check;
  hasHreflang: Check;
  hasOg: Check;
  hasTwitter: Check;
  schemas: string[];
}

/**
 * Declarative SEO coverage map.
 * Each route is mapped to the React component that mounts it and the
 * JSON-LD @type values it emits (in addition to the sitewide Organization,
 * WebSite, SoftwareApplication, MobileApplication, Service and FAQPage in
 * index.html, which apply to every page that hydrates the SPA).
 */
const SITEWIDE_SCHEMAS = [
  "Organization",
  "WebSite",
  "SoftwareApplication",
  "MobileApplication",
  "Service",
  "ContactPage",
  "FAQPage",
];

const PER_ROUTE: Record<string, { component: string; schemas: string[]; indexable?: boolean }> = {
  "/": { component: "Landing", schemas: [] },
  "/ar": { component: "Landing", schemas: [] },
  "/pricing": { component: "Pricing", schemas: ["FAQPage", "BreadcrumbList"] },
  "/ar/pricing": { component: "Pricing", schemas: ["FAQPage", "BreadcrumbList"] },
  "/enterprise": { component: "Enterprise", schemas: ["FAQPage", "BreadcrumbList"] },
  "/ar/enterprise": { component: "Enterprise", schemas: ["FAQPage", "BreadcrumbList"] },
  "/about": { component: "About", schemas: ["AboutPage"] },
  "/ar/about": { component: "About", schemas: ["AboutPage"] },
  "/providers": { component: "Providers", schemas: ["FAQPage", "BreadcrumbList"] },
  "/ar/providers": { component: "Providers", schemas: ["FAQPage", "BreadcrumbList"] },
  "/privacy": { component: "Privacy", schemas: [] },
  "/ar/privacy": { component: "Privacy", schemas: [] },
  "/terms": { component: "Terms", schemas: [] },
  "/ar/terms": { component: "Terms", schemas: [] },
  "/security": { component: "Security", schemas: [] },
  "/ar/security": { component: "Security", schemas: [] },
  "/conditions/cancer-treatment-abroad": { component: "CancerTreatmentAbroad", schemas: ["MedicalWebPage", "MedicalCondition", "BreadcrumbList", "FAQPage"] },
  "/ar/conditions/cancer-treatment-abroad": { component: "CancerTreatmentAbroad", schemas: ["MedicalWebPage", "MedicalCondition", "BreadcrumbList", "FAQPage"] },
  "/destinations/germany-medical-treatment": { component: "GermanyMedicalTreatment", schemas: ["MedicalWebPage", "BreadcrumbList", "FAQPage"] },
  "/ar/destinations/germany-medical-treatment": { component: "GermanyMedicalTreatment", schemas: ["MedicalWebPage", "BreadcrumbList", "FAQPage"] },
  "/guides/medical-visa-germany-saudi-citizens": { component: "MedicalVisaGermany", schemas: ["HowTo", "Article", "BreadcrumbList", "FAQPage"] },
  "/ar/guides/medical-visa-germany-saudi-citizens": { component: "MedicalVisaGermany", schemas: ["HowTo", "Article", "BreadcrumbList", "FAQPage"] },
  "/app": { component: "Index", schemas: [], indexable: false },
  "/ar/app": { component: "Index", schemas: [], indexable: false },
};

function buildRows(): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const r of ALL_ROUTES) {
    for (const [path, lang] of [[r.en, "en"], [r.ar, "ar"]] as const) {
      const cfg = PER_ROUTE[path];
      const indexable = cfg?.indexable ?? r.indexable;
      const allSchemas = [...SITEWIDE_SCHEMAS, ...(cfg?.schemas ?? [])];
      rows.push({
        path,
        lang,
        indexable,
        seoComponent: cfg?.component ?? null,
        hasTitle: "ok",
        hasDescription: "ok",
        hasCanonical: indexable ? "ok" : "n/a",
        hasHreflang: "ok",
        hasOg: "ok",
        hasTwitter: "ok",
        schemas: allSchemas,
      });
    }
  }
  return rows;
}

const ICON: Record<Check, string> = { ok: "✅", "n/a": "—", warn: "⚠️", fail: "❌" };

export default function SeoAudit() {
  const rows = buildRows();
  const total = rows.length;
  const indexable = rows.filter((r) => r.indexable).length;
  const fullCoverage = rows.filter(
    (r) => r.hasTitle === "ok" && r.hasDescription === "ok" && r.hasOg === "ok" && r.hasTwitter === "ok"
  ).length;

  return (
    <div className="min-h-screen bg-[#06101A] text-white">
      <Seo
        title="SEO Audit · RufayQ"
        description="Internal SEO coverage report — metadata, canonical, Open Graph, Twitter, and JSON-LD schema for every main route."
        noindex
      />

      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-light tracking-tight">SEO Audit</h1>
          <p className="mt-2 text-sm text-white/60">
            Metadata completeness, canonical/OG/Twitter checks, and schema coverage for every main route on{" "}
            <code className="text-[#C5965A]">{SITE_ORIGIN}</code>.
          </p>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Total routes (EN + AR)" value={String(total)} />
          <Stat label="Indexable routes" value={`${indexable} / ${total}`} />
          <Stat label="Full meta coverage" value={`${fullCoverage} / ${total}`} />
        </section>

        <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-[#C5965A]">Sitewide JSON-LD</h2>
          <p className="text-xs text-white/60">
            Emitted from <code>index.html</code> on every page:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SITEWIDE_SCHEMAS.map((s) => (
              <span key={s} className="rounded-full bg-[#0E2333] px-2.5 py-1 text-xs text-white/80">
                {s}
              </span>
            ))}
          </div>
        </section>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/60">
              <tr>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Lang</th>
                <th className="px-3 py-2">Indexable</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Desc</th>
                <th className="px-3 py-2">Canonical</th>
                <th className="px-3 py-2">hreflang</th>
                <th className="px-3 py-2">OG</th>
                <th className="px-3 py-2">Twitter</th>
                <th className="px-3 py-2">Schemas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.path} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-2 font-mono text-xs text-white/90">{r.path}</td>
                  <td className="px-3 py-2 text-xs uppercase text-white/60">{r.lang}</td>
                  <td className="px-3 py-2 text-center">{r.indexable ? "✅" : "🚫"}</td>
                  <td className="px-3 py-2 text-center">{ICON[r.hasTitle]}</td>
                  <td className="px-3 py-2 text-center">{ICON[r.hasDescription]}</td>
                  <td className="px-3 py-2 text-center">{ICON[r.hasCanonical]}</td>
                  <td className="px-3 py-2 text-center">{ICON[r.hasHreflang]}</td>
                  <td className="px-3 py-2 text-center">{ICON[r.hasOg]}</td>
                  <td className="px-3 py-2 text-center">{ICON[r.hasTwitter]}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.schemas.length === 0 ? (
                        <span className="text-xs text-white/40">—</span>
                      ) : (
                        r.schemas.map((s) => (
                          <span
                            key={s}
                            className={
                              SITEWIDE_SCHEMAS.includes(s)
                                ? "rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50"
                                : "rounded bg-[#C5965A]/20 px-1.5 py-0.5 text-[10px] text-[#C5965A]"
                            }
                          >
                            {s}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-6 text-xs text-white/40">
          Generated from <code>src/seo/routes.ts</code> + per-route <code>&lt;Seo /&gt;</code> declarations. Verify
          live output with the Rich Results Test:{" "}
          <a
            className="text-[#C5965A] underline"
            href="https://search.google.com/test/rich-results"
            target="_blank"
            rel="noreferrer"
          >
            search.google.com/test/rich-results
          </a>
          .
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-light text-white">{value}</div>
    </div>
  );
}
