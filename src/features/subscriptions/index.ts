/**
 * features/subscriptions — public API barrel.
 *
 * Phase 2 of the refactor: consumers should import from `@/features/subscriptions`
 * instead of reaching into `@/hooks/*`, `@/data/*`, or `@/components/*`.
 * The actual files have not moved yet — this barrel re-exports them so we can
 * relocate later without touching callers.
 */
export { useSubscription, type Subscription as SubscriptionRow } from "@/hooks/useSubscription";
export { useTrial } from "@/hooks/useTrial";
export { useTrialGate } from "@/hooks/useTrialGate";
export * from "@/data/subscriptionPlans";

// Components
export { default as PaywallModal } from "@/components/PaywallModal";
export { default as UpgradeCTA } from "@/components/UpgradeCTA";
export { default as UpgradePrompt } from "@/components/UpgradePrompt";
export { default as TrialLockBanner } from "@/components/TrialLockBanner";

// Domain logic (already lives in features/subscriptions/logic)
export * from "./logic/statusMachine";
export * from "./logic/entitlements";

// Domain types
export type {
  Subscription, SubscriptionPlan, SubscriptionStatus, BillingCycle,
} from "@/shared/types/subscription";
