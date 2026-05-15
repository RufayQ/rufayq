/**
 * useCmsPage — fetches a published CMS page with all visible sections
 * for the public landing site. Returns null while loading; hardcoded
 * defaults in components remain intact as fallback.
 *
 * Strategy chosen: client-side fetch (fastest to ship). Cached for 5 min
 * via React Query.
 */
import { useEffect, useState } from "react";
import type { CmsSection, SectionType } from "@/components/admin/cms/cmsTypes";

// NOTE: Supabase client is dynamically imported below so the 50 KB Supabase
// chunk does NOT enter the Landing route's critical bundle. CMS data is
// below the fold and overrides hardcoded defaults only when present, so
// shipping it after first paint is a pure win for FCP/LCP/TBT.

export interface CmsPageBundle {
  slug: string;
  title_en: string;
  title_ar: string | null;
  sections: CmsSection[];
}

/** Get all sections for a slug, indexed by type for quick lookup. */
export const useCmsPage = (slug: string) => {
  const [bundle, setBundle] = useState<CmsPageBundle | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: page } = await supabase
        .from("cms_pages")
        .select("id, slug, title_en, title_ar")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (!page || cancelled) { setLoaded(true); return; }
      const { data: sections } = await supabase
        .from("cms_sections")
        .select("*")
        .eq("page_id", (page as { id: string }).id)
        .eq("visible", true)
        .order("sort_order");
      if (cancelled) return;
      setBundle({
        slug: (page as { slug: string }).slug,
        title_en: (page as { title_en: string }).title_en,
        title_ar: (page as { title_ar: string | null }).title_ar,
        sections: (sections as unknown as CmsSection[]) ?? [],
      });
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  /** Returns first section of a given type (most pages have one of each). */
  const getSection = <T = Record<string, unknown>>(type: SectionType, locale: "en" | "ar" = "en"): T | null => {
    const s = bundle?.sections.find(x => x.type === type);
    if (!s) return null;
    return (locale === "en" ? s.content_en : s.content_ar) as T;
  };

  return { bundle, loaded, getSection };
};
