/** Audit log domain types (mirror of `audit_log` table). */

export type AuditAction =
  | `SUBSCRIPTION_${string}`
  | `PAYMENT_${string}`
  | `USER_${string}`
  | `ROLE_${string}`
  | `CMS_${string}`
  | `RCM_${string}`
  | string;

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: AuditAction;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}
