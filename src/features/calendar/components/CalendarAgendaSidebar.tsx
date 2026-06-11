import { format, isToday } from "date-fns";
import { Link } from "@tanstack/react-router";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSameLocalDay, resolveEventBadgeColor } from "../lib/calendar-utils";
import type { CalendarEvent } from "../hooks/useCalendarEvents";
import type { CalendarOverlayItem } from "../hooks/useCalendarOverlays";
import { CalendarOverlayPill } from "./CalendarOverlayPill";

interface Props {
  events: CalendarEvent[];
  taskItems?: CalendarOverlayItem[];
  dealItems?: CalendarOverlayItem[];
  onEventClick: (e: CalendarEvent) => void;
  onOverlayClick?: (item: CalendarOverlayItem) => void;
}

export function CalendarAgendaSidebar({
  events,
  taskItems = [],
  dealItems = [],
  onEventClick,
  onOverlayClick,
}: Props) {
  const today = new Date();
  const list = events
    .filter((e) => isSameLocalDay(e.start_at, today))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  const dueToday = [...dealItems, ...taskItems].filter((it) =>
    isSameLocalDay(it.date, today),
  );

  return (
    <aside className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Today's Agenda</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {format(today, "d. MMM")}
          {isToday(today) && " · today"}
        </span>
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          No events scheduled today.
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((ev) => (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => onEventClick(ev)}
                className="w-full text-left rounded-md border bg-background px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium">
                    {format(new Date(ev.start_at), "HH:mm")} –{" "}
                    {format(new Date(ev.end_at), "HH:mm")}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border",
                      resolveEventBadgeColor(ev),
                    )}
                  >
                    {ev.event_type}
                  </span>
                </div>
                <div className="text-sm font-medium truncate mt-0.5">{ev.title}</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ev.contact && (
                    <Link
                      to="/contacts/$id"
                      params={{ id: ev.contact.id }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ev.contact.first_name} {ev.contact.last_name ?? ""}
                    </Link>
                  )}
                  {ev.deal && (
                    <Link
                      to="/deals/$id"
                      params={{ id: ev.deal.id }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ev.deal.title}
                    </Link>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {dueToday.length > 0 && (
        <div className="pt-3 border-t space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Due today</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {dueToday.length}
            </span>
          </div>
          <div className="space-y-1">
            {dueToday.map((it) => (
              <CalendarOverlayPill
                key={it.id}
                item={it}
                showSecondary
                onClick={(i) => onOverlayClick?.(i)}
              />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
