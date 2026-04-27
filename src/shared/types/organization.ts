/** Organization & provider-application domain types. */

export type OrgKind = "hospital" | "clinic" | "vendor" | "insurer" | "other";

export interface Organization {
  id: string;
  name: string;
  kind: OrgKind;
  country: string | null;
  city: string | null;
  website: string | null;
  is_verified: boolean;
  created_at: string;
}

export type ProviderApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

export interface ProviderApplication {
  id: string;
  organization_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: ProviderApplicationStatus;
  notes: string | null;
  created_at: string;
}
