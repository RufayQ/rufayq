/**
 * features/payments — public API barrel.
 * All payment UI lives under `features/payments/{admin,patient}/ui/*` after
 * the 2026-04-27 relocation.
 */
export { default as BankTransferCheckout } from "./patient/ui/BankTransferCheckout";
export { default as ReceiptStatusTimeline } from "./patient/ui/ReceiptStatusTimeline";
export { default as ReceiptDetailsScreen } from "./patient/ui/ReceiptDetailsScreen";
export { default as MyReceiptsList } from "./patient/ui/MyReceiptsList";
export { default as AdminPayments } from "./admin/ui/AdminPayments";
export { default as AdminAddReceiptPanel } from "./admin/ui/AdminAddReceiptPanel";
export { default as ReceiptAuditLog } from "./admin/ui/ReceiptAuditLog";

// Domain logic
export * from "./logic/receipts";
export * from "./logic/auditLabels";
export { generateReceiptAuditPdf } from "./logic/receiptAuditPdf";

// Domain types
export type {
  PaymentReceipt, PaymentStatus, SubscriptionAddon,
} from "@/shared/types/payment";
export type { PatientReceipt } from "./patient/ui/ReceiptDetailsScreen";
