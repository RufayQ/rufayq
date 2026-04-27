import {
  LayoutDashboard, Users, Building2, Briefcase, Activity, Shield, FileText,
  CreditCard, MessageSquare, Star, UserPlus, Globe, Settings, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LeafKey =
  | "dashboard"
  | "users" | "user_search" | "create" | "verify_assist"
  | "orgs" | "applications"
  | "claims" | "rcm" | "rcm_activations" | "rcm_imports" | "rcm_bulk"
  | "subs" | "payments" | "ai_usage"
  | "reviews" | "tickets"
  | "news" | "pages" | "website_cms"
  | "audit"
  | "settings_general" | "settings_team";

export interface NavLeaf {
  key: LeafKey;
  label: string;
  icon?: LucideIcon;
  badgeKey?: "open_tickets" | "pending_receipts" | "pending_apps" | "pending_claims";
  adminOnly?: boolean;
}
export interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  leaves: NavLeaf[];
}

export const NAV_MODULES: NavGroup[] = [
  {
    key: "overview", label: "Overview", icon: LayoutDashboard,
    hint: "Today at RufayQ",
    leaves: [{ key: "dashboard", label: "Command Center", icon: LayoutDashboard }],
  },
  {
    key: "users", label: "Users", icon: Users,
    hint: "People & access",
    leaves: [
      { key: "users", label: "All Users", icon: Users },
      { key: "user_search", label: "Search & Assign", icon: Sparkles, adminOnly: true },
      { key: "create", label: "Create User", icon: UserPlus, adminOnly: true },
      { key: "verify_assist", label: "Activations", icon: Shield },
    ],
  },
  {
    key: "orgs", label: "Organizations", icon: Building2,
    hint: "Hospitals, vendors, insurers",
    leaves: [
      { key: "orgs", label: "Directory", icon: Building2 },
      { key: "applications", label: "Provider Applications", icon: Briefcase, badgeKey: "pending_apps" },
    ],
  },
  {
    key: "rcm", label: "Revenue Cycle", icon: Activity,
    hint: "Patient claims & RCM ops",
    leaves: [
      { key: "claims", label: "Patient Claims", icon: UserPlus, badgeKey: "pending_claims" },
      { key: "rcm", label: "RCM Masters", icon: Building2, adminOnly: true },
      { key: "rcm_activations", label: "RCM Activations", icon: Activity, adminOnly: true },
      { key: "rcm_imports", label: "RCM Imports", icon: FileText, adminOnly: true },
      { key: "rcm_bulk", label: "RCM Bulk Ops", icon: FileText, adminOnly: true },
    ],
  },
  {
    key: "billing", label: "Billing", icon: CreditCard,
    hint: "Subscriptions & receipts",
    leaves: [
      { key: "subs", label: "Subscriptions", icon: CreditCard, adminOnly: true },
      { key: "payments", label: "Payments & Receipts", icon: CreditCard, adminOnly: true, badgeKey: "pending_receipts" },
      { key: "ai_usage", label: "AI Usage", icon: Activity, adminOnly: true },
    ],
  },
  {
    key: "support", label: "Support", icon: MessageSquare,
    hint: "Tickets & reviews",
    leaves: [
      { key: "tickets", label: "Tickets", icon: MessageSquare, badgeKey: "open_tickets" },
      { key: "reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    key: "cms", label: "Website CMS", icon: Globe,
    hint: "Marketing site & content",
    leaves: [
      { key: "website_cms", label: "Pages & Sections", icon: Globe, adminOnly: true },
      { key: "news", label: "News & Articles", icon: FileText },
      { key: "pages", label: "Site Pages (legacy)", icon: FileText },
    ],
  },
  {
    key: "settings", label: "Settings", icon: Settings,
    hint: "Audit, configuration",
    leaves: [
      { key: "audit", label: "Audit Log", icon: Activity },
    ],
  },
];

export const ALL_LEAVES: NavLeaf[] = NAV_MODULES.flatMap((g) => g.leaves);

export const findGroupForLeaf = (key: LeafKey): NavGroup | undefined =>
  NAV_MODULES.find((g) => g.leaves.some((l) => l.key === key));
