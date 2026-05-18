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

export interface HeroMockupCard {
  icon?: string;
  title: string;
  subtitle?: string;
  accent?: "gold" | "teal";
}

export interface HeroContent {
  eyebrow?: string;
  titleLine1?: string;
  titleLine2?: string;
  highlight?: string;
  subtitle?: string;
  primaryCta?: CtaConfig;
  secondaryCta?: CtaConfig;
  badges?: { text: string; icon?: string }[];
  mockupCards?: HeroMockupCard[];
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

/** Contact section: free-form contact card editable per locale.
 *  Section type is `contact_form` for backwards-compat with existing rows. */
export interface ContactContent {
  title?: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  hours?: string;
  mapEmbedUrl?: string;
  /** Optional override CTA shown next to the contact details. */
  ctaLabel?: string;
  ctaLink?: string;
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
  contact_form: "Contact Info",
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
        en: {
          eyebrow: "AI COMPANION · MEDICAL, TRAVEL & MORE",
          titleLine1: "Your AI Travel Companion",
          highlight: "& More",
          subtitle: "From medical journeys to lifestyle, RufayQ guides Gulf travellers worldwide — bilingual vault, journey, tickets, medications and 24/7 AI support.",
          primaryCta: { label: "Start free", link: "/auth" },
          badges: [
            { text: "End-to-end encrypted", icon: "lock" },
            { text: "Bilingual EN / AR", icon: "globe" },
            { text: "For Gulf & global patients", icon: "heart" },
          ],
          mockupCards: [
            { icon: "🛫", title: "Business · LH 770 → Frankfurt", subtitle: "Boarding 22:40 · Gate A22", accent: "teal" },
            { icon: "🛋️", title: "Lounge ready · Visa Companion", subtitle: "DXB · Concourse B", accent: "gold" },
            { icon: "🩺", title: "Prof. Klein — Cleveland Clinic", subtitle: "Tomorrow · 11:00 AM", accent: "teal" },
            { icon: "🚘", title: "Chauffeur to The Ritz-Carlton", subtitle: "On arrival · 06:20", accent: "gold" },
          ],
        },
        ar: {
          eyebrow: "رُفَيِّق · للسفر العلاجي وأكثر",
          titleLine1: "رفيقك الذكي للسفر",
          highlight: "وأكثر",
          subtitle: "من الرحلات العلاجية إلى أسلوب الحياة، يرافقك رُفَيِّق حول العالم — خزانة طبية ثنائية اللغة، رحلات، تذاكر، أدوية ودعم ذكي على مدار الساعة.",
          primaryCta: { label: "ابدأ مجاناً", link: "/auth" },
          badges: [
            { text: "تشفير كامل", icon: "lock" },
            { text: "ثنائي اللغة عربي/إنجليزي", icon: "globe" },
            { text: "لمرضى الخليج والعالم", icon: "heart" },
          ],
          mockupCards: [
            { icon: "🛫", title: "أعمال · LH 770 → فرانكفورت", subtitle: "الصعود 22:40 · بوابة A22", accent: "teal" },
            { icon: "🛋️", title: "الصالة جاهزة · رفيق فيزا", subtitle: "دبي · مبنى B", accent: "gold" },
            { icon: "🩺", title: "البروفيسور كلاين — كليفلاند", subtitle: "غداً · 11:00 ص", accent: "teal" },
            { icon: "🚘", title: "سائق خاص إلى ريتز كارلتون", subtitle: "عند الوصول · 06:20", accent: "gold" },
          ],
        },
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
    case "contact_form":
      return {
        en: {
          title: "Contact us", subtitle: "We're here to help.",
          email: "support@rufayq.com", phone: "", whatsapp: "",
          address: "", hours: "Sun – Thu · 9:00 – 18:00 AST",
          mapEmbedUrl: "", ctaLabel: "Send a message", ctaLink: "mailto:support@rufayq.com",
        },
        ar: {
          title: "تواصل معنا", subtitle: "نحن هنا لمساعدتك.",
          email: "support@rufayq.com", phone: "", whatsapp: "",
          address: "", hours: "الأحد – الخميس · ٩:٠٠ – ١٨:٠٠ بتوقيت السعودية",
          mapEmbedUrl: "", ctaLabel: "أرسل رسالة", ctaLink: "mailto:support@rufayq.com",
        },
      };
    default:
      return { en: {}, ar: {} };
  }
};
