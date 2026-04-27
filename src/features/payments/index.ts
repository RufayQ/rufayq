/**
 * features/payments — public API barrel.
 * Re-exports current files so callers can migrate to `@/features/payments`
 * before the physical relocation happens.
 */
export { default as BankTransferCheckout } from "@/components/BankTransferCheckout";
export { default as AdminPayments } from "@/components/admin/AdminPayments";

// Domain logic
export * from "./logic/receipts";

// Domain types
export type {
  PaymentReceipt, PaymentStatus, SubscriptionAddon,
} from "@/shared/types/payment";
