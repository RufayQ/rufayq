/**
 * CMS client — pages + sections + publish workflow.
 *
 * The publish lifecycle (draft → scheduled → published → archived) is
 * validated by `features/cms/logic/publish.ts` so the same rules apply on
 * web and mobile editors.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  CmsPageSchema, CmsSectionSchema, PublishRequestSchema,
  type CmsPage, type CmsSection, type PublishRequest, type PageStatus,
} from "@/api/contracts/cms";
import { validatePublish } from "@/features/cms/logic/publish";
import type { ApiResult } from "@/api/clients/subscriptions.client";

const ok = <T>(data: T): ApiResult<T> => ({ data, error: null });
const fail = <T = never>(code: string, message: string): ApiResult<T> =>
  ({ data: null, error: { code, message } });

export const cmsClient = {
  /** Admin: list every page (system pages first, then alphabetical). */
  async listPages(): Promise<ApiResult<CmsPage[]>> {
    const { data, error } = await supabase
      .from("cms_pages")
      .select("*")
      .order("is_system", { ascending: false })
      .order("slug");
    if (error) return fail("query_failed", error.message);
    const parsed = CmsPageSchema.array().safeParse(data ?? []);
    if (!parsed.success) return fail("contract_violation", parsed.error.message);
    return ok(parsed.data);
  },

  async getPage(id: string): Promise<ApiResult<CmsPage>> {
    const { data, error } = await supabase
      .from("cms_pages").select("*").eq("id", id).maybeSingle();
    if (error) return fail("query_failed", error.message);
    const parsed = CmsPageSchema.safeParse(data);
    if (!parsed.success) return fail("contract_violation", parsed.error.message);
    return ok(parsed.data);
  },

  async listSections(pageId: string): Promise<ApiResult<CmsSection[]>> {
    const { data, error } = await supabase
      .from("cms_sections").select("*").eq("page_id", pageId).order("sort_order");
    if (error) return fail("query_failed", error.message);
    const parsed = CmsSectionSchema.array().safeParse(data ?? []);
    if (!parsed.success) return fail("contract_violation", parsed.error.message);
    return ok(parsed.data);
  },

  /**
   * Update a page's status — runs the same `validatePublish` guard used
   * by tests. Returns `validation_failed` with a human-readable message
   * when the transition is illegal.
   */
  async publish(page: CmsPage, request: PublishRequest): Promise<ApiResult<true>> {
    const parsed = PublishRequestSchema.safeParse(request);
    if (!parsed.success) return fail("invalid_input", parsed.error.message);
    const { status, scheduled_at = null } = parsed.data;
    const validation = validatePublish(
      { status: page.status, scheduled_at: page.scheduled_at, title_en: page.title_en },
      status,
      scheduled_at ?? null,
    );
    if (!validation.ok) return fail("validation_failed", validation.error || "Invalid transition");

    const patch: { status: PageStatus; scheduled_at?: string | null } = { status };
    if (status === "scheduled") patch.scheduled_at = scheduled_at ?? null;

    const { error } = await supabase
      .from("cms_pages")
      .update(patch as never)
      .eq("id", page.id);
    if (error) return fail("update_failed", error.message);
    return ok(true);
  },

  async createPage(slug: string, titleEn: string): Promise<ApiResult<true>> {
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!cleanSlug || !titleEn.trim()) return fail("invalid_input", "Slug and title are required");
    const { error } = await supabase
      .from("cms_pages")
      .insert({ slug: cleanSlug, title_en: titleEn.trim(), status: "draft" } as never);
    if (error) return fail("insert_failed", error.message);
    return ok(true);
  },

  async deletePage(id: string): Promise<ApiResult<true>> {
    const { error } = await supabase.from("cms_pages").delete().eq("id", id);
    if (error) return fail("delete_failed", error.message);
    return ok(true);
  },
};
