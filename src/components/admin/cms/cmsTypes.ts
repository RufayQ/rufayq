/**
 * Website CMS — shared types & schema helpers.
 *
 * Each CMS section's `content_en` / `content_ar` is a JSON blob whose shape
 * depends on `type`. We define typed helpers for the Core 7 block types so
 * the admin editors render the right fields. Other types (testimonials,
 * trust_logos, etc.) fall back to a generic JSON editor for Phase 1.
 */
export type SectionType =
  | "hero" | "features" | "how" | "pricing" | "faq" | "cta" | "rich_text"
  | "testimonials" | "trust_logos" | "providers" | "contact_form"
  | "comparison" | "timeline" | "video" | "stats" | "text_image" | "footer_cta" | "team";

export type PageStatus = "draft" | "published" | "scheduled" | "archived";

export interface CtaConfig { label: string; link: string }

export interface HeroContent {
  eyebrow?: string;
  titleLine1?: string;
  titleLine2?: string;
  highlight?: string;
  subtitle?: string;
  primaryCta?: CtaConfig;
  secondaryCta?: CtaConfig;
  badges?: { text: string; icon?: string }[];
}

export interface FeaturesContent {
  title?: string;
  subtitle?: string;
  cards?: { icon?: string; title: string; desc?: string; ctaLabel?: string; ctaLink?: string }[];
}

export interface HowContent {
  title?: string;
  subtitle?: string;
  steps?: { icon?: string; title: string; desc?: string }[];
}

export interface CtaSectionContent {
  title?: string;
  subtitle?: string;
  primaryCta?: CtaConfig;
  secondaryCta?: CtaConfig;
}

export interface FaqContent {
  title?: string;
  subtitle?: string;
  items?: { q: string; a: string }[];
}

export interface PricingContent {
  title?: string;
  subtitle?: string;
  // tier definitions are managed in `subscriptionPlans.ts` for Phase 1 — we
  // only let admins override the headline copy here.
}

export interface RichTextContent {
  title?: string;
  body?: string;  // markdown / plain
}

export interface CmsSection {
  id: string;
  page_id: string;
  type: SectionType;
  sort_order: number;
  visible: boolean;
  scheduled_at: string | null;
  content_en: Record<string, unknown>;
  content_ar: Record<string, unknown>;
  config: Record<string, unknown>;
  updated_at: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string | null;
  status: PageStatus;
  scheduled_at: string | null;
  seo_title_en: string | null;
  seo_title_ar: string | null;
  seo_desc_en: string | null;
  seo_desc_ar: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  index_in_search: boolean;
  include_sitemap: boolean;
  is_system: boolean;
  updated_at: string;
}

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero Banner",
  features: "Feature Grid",
  how: "How It Works",
  pricing: "Pricing Cards",
  faq: "FAQ Accordion",
  cta: "CTA Banner",
  rich_text: "Rich Text Block",
  testimonials: "Testimonials",
  trust_logos: "Trust Logos",
  providers: "Provider Showcase",
  contact_form: "Contact Form",
  comparison: "Comparison Table",
  timeline: "Timeline",
  video: "Video Section",
  stats: "Stats Counter",
  text_image: "Text + Image",
  footer_cta: "Footer CTA",
  team: "Team Section",
};

/** Sensible empty content for each section type (used when admin adds a block). */
export const emptyContent = (type: SectionType): { en: Record<string, unknown>; ar: Record<string, unknown> } => {
  switch (type) {
    case "hero":
      return {
        en: { titleLine1: "New hero title", subtitle: "", primaryCta: { label: "Get started", link: "/" }, badges: [] },
        ar: { titleLine1: "", subtitle: "", primaryCta: { label: "", link: "/" }, badges: [] },
      };
    case "features":
      return { en: { title: "Features", subtitle: "", cards: [] }, ar: { title: "", subtitle: "", cards: [] } };
    case "how":
      return { en: { title: "How it works", subtitle: "", steps: [] }, ar: { title: "", subtitle: "", steps: [] } };
    case "cta":
      return {
        en: { title: "Ready to start?", subtitle: "", primaryCta: { label: "Start", link: "/auth" } },
        ar: { title: "", subtitle: "", primaryCta: { label: "", link: "/auth" } },
      };
    case "faq":
      return { en: { title: "FAQ", subtitle: "", items: [] }, ar: { title: "", subtitle: "", items: [] } };
    case "pricing":
      return { en: { title: "Pricing", subtitle: "" }, ar: { title: "", subtitle: "" } };
    case "rich_text":
      return { en: { title: "", body: "" }, ar: { title: "", body: "" } };
    default:
      return { en: {}, ar: {} };
  }
};
