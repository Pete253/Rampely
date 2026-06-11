import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { formatTime, resolveEventColor } from "../lib/calendar-utils";
import type { CalendarEvent } from "../hooks/useCalendarEvents";

interface Props {
  event: CalendarEvent;
  style: React.CSSProperties;
  onClick: () => void;
  size?: "sm" | "md";
}

export function EventCard({ event, style, onClick, size = "md" }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });

  const dragStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleClick = (e: React.MouseEvent) => {
    // PointerSensor with 8px activationConstraint already prevents click during drag
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      role="button"
      tabIndex={0}
      className={cn(
        "absolute left-1 right-1 cursor-grab active:cursor-grabbing select-none touch-none",
        "overflow-hidden rounded border shadow-sm",
        size === "sm" ? "px-1.5 py-1 text-[11px]" : "px-2 py-1 text-xs",
        resolveEventColor(event),
      )}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className={cn("opacity-90", size === "sm" ? "text-[10px]" : "text-[11px]")}>
        {formatTime(event.start_at)}–{formatTime(event.end_at)}
      </div>
    </div>
  );
}
