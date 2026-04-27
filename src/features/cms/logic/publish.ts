/**
 * CMS publish workflow — single source of truth for page lifecycle rules.
 *
 * Lifecycle: draft → scheduled → published → archived
 *   • draft     – never visible
 *   • scheduled – visible only when `scheduled_at <= now()`
 *   • published – immediately visible
 *   • archived  – removed from public site, preserved in DB
 *
 * These helpers are pure so they can be unit-tested without Supabase.
 */
import type { CmsPage, PageStatus } from "@/shared/types/cms";

/* ── Transition matrix ──────────────────────────────────────────────── */

const ALLOWED: Record<PageStatus, PageStatus[]> = {
  draft:     ["scheduled", "published", "archived"],
  scheduled: ["draft", "published", "archived"],
  published: ["draft", "archived"],
  archived:  ["draft"],
};

export const canTransition = (from: PageStatus, to: PageStatus): boolean =>
  ALLOWED[from]?.includes(to) ?? false;

/* ── Validation ─────────────────────────────────────────────────────── */

export interface PublishValidation {
  ok: boolean;
  error?: string;
}

/**
 * Validate a status change before persisting it.
 * Returns `{ ok: false, error }` with a human-readable reason if invalid.
 */
export const validatePublish = (
  page: Pick<CmsPage, "status" | "scheduled_at" | "title_en">,
  next: PageStatus,
  scheduledAt: string | null,
  now: Date = new Date(),
): PublishValidation => {
  if (page.status === next) return { ok: false, error: "No status change" };
  if (!canTransition(page.status, next)) {
    return { ok: false, error: `Cannot move ${page.status} → ${next}` };
  }
  if (next === "published" && !page.title_en?.trim()) {
    return { ok: false, error: "English title is required to publish" };
  }
  if (next === "scheduled") {
    if (!scheduledAt) return { ok: false, error: "scheduled_at is required" };
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return { ok: false, error: "scheduled_at is not a valid date" };
    }
    if (when.getTime() <= now.getTime()) {
      return { ok: false, error: "scheduled_at must be in the future" };
    }
  }
  return { ok: true };
};

/**
 * Decide whether a page is publicly visible *right now*.
 * Used by the public site loader so scheduled-but-not-yet-due pages are hidden.
 */
export const isVisibleNow = (
  page: Pick<CmsPage, "status" | "scheduled_at">,
  now: Date = new Date(),
): boolean => {
  if (page.status === "published") return true;
  if (page.status === "scheduled" && page.scheduled_at) {
    return new Date(page.scheduled_at).getTime() <= now.getTime();
  }
  return false;
};

/** Tone classes for the page-status badge. */
export const PAGE_STATUS_TONE: Record<PageStatus, string> = {
  draft:     "bg-slate-700/50 text-slate-300",
  published: "bg-emerald-700/30 text-emerald-300 border-emerald-700/50",
  scheduled: "bg-sky-700/30 text-sky-300 border-sky-700/50",
  archived:  "bg-stone-700/30 text-stone-300 border-stone-700/50",
};
