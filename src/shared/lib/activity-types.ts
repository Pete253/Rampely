import { StickyNote, Phone, Mail, Calendar, CheckSquare, type LucideIcon } from "lucide-react";

export const ACTIVITY_TYPES = ["note", "call", "email", "meeting", "task"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityTypeMeta {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
}

export const ACTIVITY_TYPE_META: Record<ActivityType, ActivityTypeMeta> = {
  note: {
    label: "Note",
    icon: StickyNote,
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  call: {
    label: "Call",
    icon: Phone,
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  email: {
    label: "Email",
    icon: Mail,
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  meeting: {
    label: "Meeting",
    icon: Calendar,
    badgeClass: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  task: {
    label: "Task",
    icon: CheckSquare,
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

export const CALL_OUTCOMES = [
  "Connected",
  "Voicemail",
  "No Answer",
  "Callback Scheduled",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
