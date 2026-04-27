/**
 * CMS API contract — pages + sections.
 * Page status is the canonical lifecycle managed by `features/cms/logic/publish.ts`.
 */
import { z } from "zod";

export const PageStatusSchema = z.enum(["draft", "scheduled", "published", "archived"]);

export const SectionTypeSchema = z.enum([
  "hero", "features", "how", "pricing", "faq", "cta", "rich_text",
  "testimonials", "trust_logos", "providers", "contact_form",
  "comparison", "timeline", "video", "stats", "text_image", "footer_cta", "team",
]);

export const CmsPageSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title_en: z.string(),
  title_ar: z.string().nullable(),
  status: PageStatusSchema,
  scheduled_at: z.string().nullable(),
  seo_title_en: z.string().nullable(),
  seo_title_ar: z.string().nullable(),
  seo_desc_en: z.string().nullable(),
  seo_desc_ar: z.string().nullable(),
  og_image_url: z.string().nullable(),
  canonical_url: z.string().nullable(),
  index_in_search: z.boolean(),
  include_sitemap: z.boolean(),
  is_system: z.boolean(),
  updated_at: z.string(),
});

export const CmsSectionSchema = z.object({
  id: z.string().uuid(),
  page_id: z.string().uuid(),
  type: SectionTypeSchema,
  sort_order: z.number(),
  visible: z.boolean(),
  scheduled_at: z.string().nullable(),
  content_en: z.record(z.unknown()),
  content_ar: z.record(z.unknown()),
  config: z.record(z.unknown()),
  updated_at: z.string(),
});

export const PublishRequestSchema = z.object({
  status: PageStatusSchema,
  scheduled_at: z.string().nullable().optional(),
});

export type CmsPage = z.infer<typeof CmsPageSchema>;
export type CmsSection = z.infer<typeof CmsSectionSchema>;
export type PageStatus = z.infer<typeof PageStatusSchema>;
export type PublishRequest = z.infer<typeof PublishRequestSchema>;
