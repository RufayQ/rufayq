/**
 * Bilingual labels for `admin_audit_log.action` values that target a
 * payment receipt. Used by ReceiptAuditLog (UI) and receiptAuditPdf (export)
 * so the same wording appears everywhere.
 */
export const ACTION_LABELS: Record<string, { en: string; ar: string }> = {
  payment_receipt_uploaded:     { en: "Receipt uploaded",          ar: "تم رفع الإيصال" },
  payment_receipt_pending:      { en: "Pending review",            ar: "بانتظار المراجعة" },
  payment_receipt_under_review: { en: "Under review",              ar: "قيد المراجعة" },
  payment_receipt_needs_more_info: { en: "More info requested",    ar: "طُلبت معلومات إضافية" },
  payment_receipt_verified:     { en: "Approved",                  ar: "تمت الموافقة" },
  payment_receipt_rejected:     { en: "Rejected",                  ar: "تم الرفض" },
  payment_receipt_code_expired: { en: "Reference code expired",    ar: "انتهت صلاحية المرجع" },
};

export const labelFor = (action: string) =>
  ACTION_LABELS[action] ?? { en: action.replace(/^payment_receipt_/, "").replace(/_/g, " "), ar: action };
