/**
 * features/admin — public API barrel for everything admin-portal that
 * isn't already exposed under another feature (subscriptions/payments/cms/rcm).
 */
export { default as AdminDashboard } from "@/components/admin/AdminDashboard";
export { default as AdminUsers } from "@/components/admin/AdminUsers";
export { default as AdminUserSearch } from "@/components/admin/AdminUserSearch";
export { default as AdminCreateUser } from "@/components/admin/AdminCreateUser";
export { default as AdminVerificationAssist } from "@/components/admin/AdminVerificationAssist";
export { default as AdminOrganizations } from "@/components/admin/AdminOrganizations";
export { default as AdminProviderApplications } from "@/components/admin/AdminProviderApplications";
export { default as AdminTickets } from "@/components/admin/AdminTickets";
export { default as AdminReviews } from "@/components/admin/AdminReviews";
export { default as AdminAuditLog } from "@/components/admin/AdminAuditLog";
export { default as AdminSettingsGeneral } from "@/components/admin/AdminSettingsGeneral";
export { default as AdminSettingsTeam } from "@/components/admin/AdminSettingsTeam";
export { default as AdminAiUsage } from "@/components/admin/AdminAiUsage";
export { default as AdminSubscriptions } from "@/components/admin/AdminSubscriptions";

// Shell
export { NAV_MODULES, ALL_LEAVES, findGroupForLeaf,
  type LeafKey, type NavGroup, type NavLeaf } from "@/components/admin/shell/adminNav";
export { default as ComingSoon } from "@/components/admin/shell/ComingSoon";
export { default as SecondaryPanel } from "@/components/admin/shell/SecondaryPanel";
export { default as GlobalSearchPalette } from "@/components/admin/shell/GlobalSearchPalette";
export { default as QuickCreateMenu } from "@/components/admin/shell/QuickCreateMenu";
export { useAdminBadges } from "@/components/admin/shell/useAdminBadges";
