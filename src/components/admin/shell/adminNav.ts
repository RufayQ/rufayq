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
  /** Counts shown as a numeric badge (action queues). */
  badgeKey?: "open_tickets" | "pending_receipts" | "pending_apps" | "pending_claims";
  /** Static dot indicator (e.g. NEW / BETA). */
  pillTone?: "new" | "beta" | "live";
  /** Optional section grouping inside a module (renders an expandable header). */
  section?: string;
  adminOnly?: boolean;
}
export interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  /** Optional ordered section labels for nested layout. */
  sections?: string[];
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
    sections: ["Directory", "Onboarding"],
    leaves: [
      { key: "users",        label: "All Users",       icon: Users,    section: "Directory" },
      { key: "user_search",  label: "Search & Assign", icon: Sparkles, section: "Directory", adminOnly: true, pillTone: "new" },
      { key: "create",       label: "Create User",     icon: UserPlus, section: "Onboarding", adminOnly: true },
      { key: "verify_assist", label: "Activations",    icon: Shield,   section: "Onboarding" },
    ],
  },
  {
    key: "orgs", label: "Organizations", icon: Building2,
    hint: "Hospitals, vendors, insurers",
    leaves: [
      { key: "orgs",         label: "Directory",            icon: Building2 },
      { key: "applications", label: "Provider Applications", icon: Briefcase, badgeKey: "pending_apps" },
    ],
  },
  {
    key: "rcm", label: "Revenue Cycle", icon: Activity,
    hint: "Patient claims & RCM ops",
    sections: ["Patient", "RCM Engine"],
    leaves: [
      { key: "claims",          label: "Patient Claims",    icon: UserPlus,  badgeKey: "pending_claims", section: "Patient" },
      { key: "rcm",             label: "RCM Masters",       icon: Building2, adminOnly: true, section: "RCM Engine" },
      { key: "rcm_activations", label: "RCM Activations",   icon: Activity,  adminOnly: true, section: "RCM Engine" },
      { key: "rcm_imports",     label: "RCM Imports",       icon: FileText,  adminOnly: true, section: "RCM Engine" },
      { key: "rcm_bulk",        label: "RCM Bulk Ops",      icon: FileText,  adminOnly: true, section: "RCM Engine" },
    ],
  },
  {
    key: "billing", label: "Billing", icon: CreditCard,
    hint: "Subscriptions & receipts",
    sections: ["Revenue", "Insights"],
    leaves: [
      { key: "subs",     label: "Subscriptions",       icon: CreditCard, adminOnly: true, section: "Revenue" },
      { key: "payments", label: "Payments & Receipts", icon: CreditCard, adminOnly: true, badgeKey: "pending_receipts", section: "Revenue" },
      { key: "ai_usage", label: "AI Usage",            icon: Activity,   adminOnly: true, section: "Insights" },
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
    sections: ["Structure", "Editorial"],
    leaves: [
      { key: "website_cms", label: "Pages & Sections",   icon: Globe,    adminOnly: true, section: "Structure", pillTone: "live" },
      { key: "news",        label: "News & Articles",    icon: FileText, section: "Editorial" },
      { key: "pages",       label: "Site Pages (legacy)", icon: FileText, section: "Editorial" },
    ],
  },
  {
    key: "settings", label: "Settings", icon: Settings,
    hint: "Audit, configuration",
    sections: ["Workspace", "Security"],
    leaves: [
      { key: "settings_general", label: "General",   icon: Settings, section: "Workspace" },
      { key: "settings_team",    label: "Team & Roles", icon: Users,  section: "Workspace", adminOnly: true },
      { key: "audit",            label: "Audit Log", icon: Activity, section: "Security" },
    ],
  },
];

export const ALL_LEAVES: NavLeaf[] = NAV_MODULES.flatMap((g) => g.leaves);

export const findGroupForLeaf = (key: LeafKey): NavGroup | undefined =>
  NAV_MODULES.find((g) => g.leaves.some((l) => l.key === key));
