import {
  Building2,
  Users,
  Briefcase,
  CheckSquare,
  Calendar,
  StickyNote,
  BarChart3,
  Plus,
  type LucideIcon,
} from "lucide-react";
import type { CreateEntity } from "@/shared/contexts/PendingCreateContext";

export type EntityType = "company" | "contact" | "deal" | "task" | "event" | "activity";

export interface GroupMeta {
  id: EntityType;
  label: string;
  icon: LucideIcon;
  /** target list route used for "See all" */
  listRoute: string;
}

export const GROUP_ORDER: EntityType[] = [
  "company",
  "contact",
  "deal",
  "task",
  "event",
  "activity",
];

export const GROUPS: Record<EntityType, GroupMeta> = {
  company: { id: "company", label: "Companies", icon: Building2, listRoute: "/companies" },
  contact: { id: "contact", label: "Contacts", icon: Users, listRoute: "/contacts" },
  deal: { id: "deal", label: "Deals", icon: Briefcase, listRoute: "/pipeline" },
  task: { id: "task", label: "Tasks", icon: CheckSquare, listRoute: "/tasks" },
  event: { id: "event", label: "Events", icon: Calendar, listRoute: "/calendar" },
  activity: { id: "activity", label: "Activities", icon: StickyNote, listRoute: "/reports" },
};

export interface QuickActionDef {
  id: string;
  label: string;
  icon: LucideIcon;
  kind: "create" | "navigate";
  /** create entity */
  create?: CreateEntity;
  /** navigate route */
  to?: string;
  /** keyboard hint (display only) */
  hint?: string;
}

export const QUICK_ACTIONS: QuickActionDef[] = [
  { id: "create-company", label: "Create Company", icon: Plus, kind: "create", create: "company", hint: "N C" },
  { id: "create-contact", label: "Create Contact", icon: Plus, kind: "create", create: "contact", hint: "N P" },
  { id: "create-deal", label: "Create Deal", icon: Plus, kind: "create", create: "deal", hint: "N D" },
  { id: "create-task", label: "Create Task", icon: Plus, kind: "create", create: "task", hint: "N T" },
  { id: "create-event", label: "Create Event", icon: Plus, kind: "create", create: "event", hint: "N E" },
  { id: "go-reports", label: "Go to Reports", icon: BarChart3, kind: "navigate", to: "/reports", hint: "G H" },
];

export function entityRoute(type: EntityType, id: string): { to: string; params: Record<string, string> } | null {
  switch (type) {
    case "company":
      return { to: "/companies/$id", params: { id } };
    case "contact":
      return { to: "/contacts/$id", params: { id } };
    case "deal":
      return { to: "/deals/$id", params: { id } };
    case "task":
      return { to: "/tasks", params: {} };
    case "event":
      return { to: "/calendar", params: {} };
    case "activity":
      return null;
    default:
      return null;
  }
}
