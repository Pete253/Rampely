import { cn } from "@/lib/utils";
import { ACTIVITY_TYPE_META, type ActivityType } from "@/shared/lib/activity-types";

interface Props {
  type: ActivityType;
  className?: string;
}

export function ActivityTypeIcon({ type, className }: Props) {
  const meta = ACTIVITY_TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        meta.badgeClass,
        className,
      )}
      aria-label={meta.label}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
