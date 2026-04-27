/**
 * Re-export of CMS domain types. The canonical definitions still live next
 * to the CMS editors at `components/admin/cms/cmsTypes.ts`; this file gives
 * the rest of the app a stable `@/shared/types/cms` import path so when we
 * move the editors into `features/cms/` later the public API doesn't change.
 */
export * from "@/components/admin/cms/cmsTypes";
