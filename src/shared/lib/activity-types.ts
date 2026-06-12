import { StickyNote, Phone, Mail, Calendar, CheckSquare, type LucideIcon } from "lucide-react";

export const ACTIVITY_TYPES = ["note", "call", "email", "meeting", "task"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityTypeMeta {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
}

// Tints mirror ACTIVITY_COLORS in the reporting chart config.
export const ACTIVITY_TYPE_META: Record<ActivityType, ActivityTypeMeta> = {
  note: {
    label: "Note",
    icon: StickyNote,
    badgeClass: "bg-blue-5/12 text-blue-5",
  },
  call: {
    label: "Call",
    icon: Phone,
    badgeClass: "bg-blue-3/12 text-blue-3",
  },
  email: {
    label: "Email",
    icon: Mail,
    badgeClass: "bg-primary/15 text-primary-light",
  },
  meeting: {
    label: "Meeting",
    icon: Calendar,
    badgeClass: "bg-warning/12 text-warning",
  },
  task: {
    label: "Task",
    icon: CheckSquare,
    badgeClass: "bg-success/12 text-success",
  },
};

export const CALL_OUTCOMES = ["Connected", "Voicemail", "No Answer", "Callback Scheduled"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
