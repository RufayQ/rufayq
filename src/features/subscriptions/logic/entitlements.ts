/**
 * Plan entitlements — single source of truth for what each tier unlocks.
 * Replaces ad-hoc `if (plan === 'COMPANION')` checks scattered across
 * PaywallModal, useSubscription, and admin UIs.
 */
import type { SubscriptionPlan } from "@/shared/types/subscription";
import { normalizePlanCode } from "./statusMachine";

export type Entitlement =
  | "ai_chat_unlimited"
  | "documents_unlimited"
  | "medication_manager"
  | "care_hub_full"
  | "medical_consultant"
  | "ksa_care_coordination"
  | "family_addon"
  | "priority_support";

const MATRIX: Record<SubscriptionPlan, Entitlement[]> = {
  FREE: [],
  STARTER: ["ai_chat_unlimited", "documents_unlimited", "medication_manager"],
  COMPANION: [
    "ai_chat_unlimited", "documents_unlimited", "medication_manager",
    "care_hub_full", "medical_consultant", "ksa_care_coordination",
    "family_addon", "priority_support",
  ],
  FAMILY: [
    "ai_chat_unlimited", "documents_unlimited", "medication_manager",
    "care_hub_full", "medical_consultant", "ksa_care_coordination",
    "family_addon", "priority_support",
  ],
};

export const hasFeature = (plan: string | null | undefined, key: Entitlement): boolean => {
  const code = normalizePlanCode(plan);
  if (!code) return false;
  return MATRIX[code].includes(key);
};
