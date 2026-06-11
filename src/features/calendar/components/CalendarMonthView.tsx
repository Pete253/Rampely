import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { buildMonthGrid, isSameLocalDay, resolveEventColor } from "../lib/calendar-utils";
import type { CalendarEvent } from "../hooks/useCalendarEvents";
import type { CalendarOverlayItem } from "../hooks/useCalendarOverlays";
import { CalendarOverlayPill } from "./CalendarOverlayPill";

interface Props {
  anchor: Date;
  events: CalendarEvent[];
  taskItems?: CalendarOverlayItem[];
  dealItems?: CalendarOverlayItem[];
  onSelectDay: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
  onOverlayClick?: (item: CalendarOverlayItem) => void;
}

const WEEKDAY_LABELS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

export function CalendarMonthView({
  anchor,
  events,
  taskItems = [],
  dealItems = [],
  onSelectDay,
  onEventClick,
  onOverlayClick,
}: Props) {
  const days = buildMonthGrid(anchor);
  const monthIndex = anchor.getMonth();

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvents = events.filter((e) => isSameLocalDay(e.start_at, day));
          const dayOverlays = [
            ...dealItems.filter((it) => isSameLocalDay(it.date, day)),
            ...taskItems.filter((it) => isSameLocalDay(it.date, day)),
          ];
          const inMonth = day.getMonth() === monthIndex;
          const overlayCap = 2;
          const visibleOverlays = dayOverlays.slice(0, overlayCap);
          const overlayOverflow = Math.max(0, dayOverlays.length - overlayCap);
          const eventCap = Math.max(0, 3 - visibleOverlays.length);
          const visibleEvents = dayEvents.slice(0, eventCap);
          const eventOverflow = Math.max(0, dayEvents.length - eventCap);
          const totalOverflow = overlayOverflow + eventOverflow;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "min-h-[110px] border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday(day) && "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </div>
              <div className="mt-1 space-y-0.5">
                {visibleOverlays.map((it) => (
                  <CalendarOverlayPill
                    key={it.id}
                    item={it}
                    onClick={(item) => onOverlayClick?.(item)}
                  />
                ))}
                {visibleEvents.map((ev) => (
                  <div
                    key={ev.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        onEventClick(ev);
                      }
                    }}
                    className={cn(
                      "truncate rounded px-1.5 py-0.5 text-[11px] font-medium border",
                      resolveEventColor(ev),
                    )}
                  >
                    {format(new Date(ev.start_at), "HH:mm")} {ev.title}
                  </div>
                ))}
                {totalOverflow > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    +{totalOverflow} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// re-export for type checking convenience
export { isSameDay };
