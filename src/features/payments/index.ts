/**
 * features/payments — public API barrel.
 * All payment UI lives under `features/payments/{admin,patient}/ui/*` after
 * the 2026-04-27 relocation.
 */
export { default as BankTransferCheckout } from "./patient/ui/BankTransferCheckout";
export { default as ReceiptStatusTimeline } from "./patient/ui/ReceiptStatusTimeline";
export { default as AdminPayments } from "./admin/ui/AdminPayments";
export { default as AdminAddReceiptPanel } from "./admin/ui/AdminAddReceiptPanel";
export { default as ReceiptAuditLog } from "./admin/ui/ReceiptAuditLog";

// Domain logic
export * from "./logic/receipts";

// Domain types
export type {
  PaymentReceipt, PaymentStatus, SubscriptionAddon,
} from "@/shared/types/payment";
