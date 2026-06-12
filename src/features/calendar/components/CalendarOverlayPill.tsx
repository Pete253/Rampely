import { Briefcase, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarOverlayItem } from "../hooks/useCalendarOverlays";

interface Props {
  item: CalendarOverlayItem;
  onClick: (item: CalendarOverlayItem) => void;
  showSecondary?: boolean;
  className?: string;
}

export function CalendarOverlayPill({ item, onClick, showSecondary = false, className }: Props) {
  const Icon = item.kind === "task" ? CheckSquare : Briefcase;

  const tone =
    item.kind === "task"
      ? item.overdue
        ? "bg-danger/15 text-danger border-danger/40"
        : "bg-warning/15 text-warning border-warning/40"
      : "bg-blue-5/15 text-blue-5 border-blue-5/40";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(item);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          onClick(item);
        }
      }}
      title={`${item.title}${item.secondary ? ` · ${item.secondary}` : ""}`}
      className={cn(
        "group flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors hover:brightness-110",
        tone,
        item.muted && "opacity-60 line-through decoration-1",
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{item.title}</span>
      {showSecondary && item.secondary && (
        <span className="ml-auto shrink-0 text-[10px] opacity-80">{item.secondary}</span>
      )}
    </button>
  );
}
