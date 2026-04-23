/**
 * useLandingSections — fetches the admin-editable landing copy from the
 * `landing-sections` row of `site_pages` and parses it into a typed map.
 *
 * Markdown convention (per language):
 *   ## <section-key>          ← features | how | pricing | faq | contact | providers
 *   ### Title
 *   <one line title>
 *   ### Subtitle
 *   <one line subtitle / intro>
 *
 * Fonts, colors, icons, and overall layout stay code-controlled — only
 * the text inside each section's headline + intro paragraph is editable.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SectionKey = "features" | "how" | "pricing" | "faq" | "contact" | "providers";

export interface SectionCopy {
  title: string;
  subtitle: string;
}

export type LandingSections = Record<SectionKey, SectionCopy>;

const EMPTY: LandingSections = {
  features: { title: "", subtitle: "" },
  how: { title: "", subtitle: "" },
  pricing: { title: "", subtitle: "" },
  faq: { title: "", subtitle: "" },
  contact: { title: "", subtitle: "" },
  providers: { title: "", subtitle: "" },
};

const parse = (md: string): LandingSections => {
  const out: LandingSections = JSON.parse(JSON.stringify(EMPTY));
  if (!md.trim()) return out;
  const lines = md.split("\n");
  let section: SectionKey | null = null;
  let field: "title" | "subtitle" | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    const sec = line.match(/^##\s+([a-z]+)\s*$/i);
    if (sec) {
      const key = sec[1].toLowerCase() as SectionKey;
      section = key in out ? key : null;
      field = null;
      continue;
    }
    const sub = line.match(/^###\s+(Title|Subtitle)\s*$/i);
    if (sub) {
      field = sub[1].toLowerCase() as "title" | "subtitle";
      continue;
    }
    if (section && field && line) {
      out[section][field] = out[section][field] ? `${out[section][field]} ${line}` : line;
    }
  }
  return out;
};

/** Returns parsed EN/AR landing copy. Empty strings until loaded. */
export const useLandingSections = (): { en: LandingSections; ar: LandingSections; loaded: boolean } => {
  const [state, setState] = useState<{ en: LandingSections; ar: LandingSections; loaded: boolean }>({
    en: EMPTY, ar: EMPTY, loaded: false,
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("site_pages")
        .select("body_md, body_md_ar")
        .eq("slug", "landing-sections")
        .maybeSingle();
      if (cancelled) return;
      setState({
        en: parse(data?.body_md || ""),
        ar: parse((data as { body_md_ar?: string } | null)?.body_md_ar || ""),
        loaded: true,
      });
    })();
    return () => { cancelled = true; };
  }, []);
  return state;
};
