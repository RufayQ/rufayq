/**
 * features/auth — public API barrel.
 */
export { default as Auth } from "@/pages/Auth";
export { default as AdminLogin } from "@/pages/AdminLogin";
export { default as OtpInput } from "@/components/OtpInput";
export { useDeviceId, getDeviceId } from "@/hooks/useDeviceId";

// Domain logic (added in Phase 1)
export * from "./logic/permissions";

// Permission UI gating
export { Can } from "./Can";
export { usePermissions } from "./usePermissions";

// Types
export type { AppRole, AppUser, UserRoleRow } from "@/shared/types/user";
