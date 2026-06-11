import { useMemo } from "react";
import { format, isToday } from "date-fns";
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DAY_HOURS,
  VISIBLE_HOUR_END,
  VISIBLE_HOUR_START,
  buildWeekDays,
  isSameLocalDay,
} from "../lib/calendar-utils";
import { EventCard } from "./EventCard";
import type { CalendarEvent } from "../hooks/useCalendarEvents";
import type { CalendarOverlayItem } from "../hooks/useCalendarOverlays";
import { CalendarOverlayPill } from "./CalendarOverlayPill";

interface Props {
  anchor: Date;
  events: CalendarEvent[];
  taskItems?: CalendarOverlayItem[];
  dealItems?: CalendarOverlayItem[];
  onSlotClick: (start: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
  onOverlayClick?: (item: CalendarOverlayItem) => void;
  onReschedule?: (id: string, newStart: Date, newEnd: Date) => Promise<void> | void;
}

const HOUR_HEIGHT = 48;

function eventBlockStyle(ev: CalendarEvent): React.CSSProperties {
  const s = new Date(ev.start_at);
  const e = new Date(ev.end_at);
  const startMin = s.getHours() * 60 + s.getMinutes();
  const endMin = e.getHours() * 60 + e.getMinutes();
  const top = (startMin / 60) * HOUR_HEIGHT;
  const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT);
  return { top: `${top}px`, height: `${height}px` };
}

function DroppableSlot({
  day,
  hour,
  onClick,
}: {
  day: Date;
  hour: number;
  onClick: () => void;
}) {
  const id = `slot:${format(day, "yyyy-MM-dd")}:${hour}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { day: day.toISOString(), hour } });
  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "absolute left-0 right-0 border-t hover:bg-muted/30 transition-colors",
        hour >= VISIBLE_HOUR_START && hour < VISIBLE_HOUR_END ? "bg-background" : "bg-muted/10",
        isOver && "bg-primary/10 ring-1 ring-primary/40",
      )}
      style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
      aria-label={`Slot ${hour}:00`}
    />
  );
}

export function CalendarWeekView({
  anchor,
  events,
  taskItems = [],
  dealItems = [],
  onSlotClick,
  onEventClick,
  onOverlayClick,
  onReschedule,
}: Props) {
  const days = buildWeekDays(anchor);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const eventMap = useMemo(() => {
    const m = new Map<string, CalendarEvent>();
    events.forEach((e) => m.set(e.id, e));
    return m;
  }, [events]);

  const allOverlays = useMemo(() => [...dealItems, ...taskItems], [dealItems, taskItems]);

  async function handleDragEnd(e: DragEndEvent) {
    if (!e.over || !onReschedule) return;
    const ev = eventMap.get(String(e.active.id));
    if (!ev) return;
    const data = e.over.data.current as { day: string; hour: number } | undefined;
    if (!data) return;
    const start = new Date(ev.start_at);
    const end = new Date(ev.end_at);
    const duration = end.getTime() - start.getTime();
    const targetDay = new Date(data.day);
    const newStart = new Date(targetDay);
    newStart.setHours(data.hour, start.getMinutes(), 0, 0);
    if (newStart.getTime() === start.getTime()) return;
    const newEnd = new Date(newStart.getTime() + duration);
    try {
      await onReschedule(ev.id, newStart, newEnd);
      toast.success("Event rescheduled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule");
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="px-2 py-2 text-center text-xs">
              <div className="text-muted-foreground">{format(d, "EEE")}</div>
              <div
                className={cn(
                  "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                  isToday(d) && "bg-primary text-primary-foreground",
                )}
              >
                {format(d, "d")}
              </div>
            </div>
          ))}
        </div>
        {/* All-day overlay row */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/20">
          <div className="px-1.5 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            All-day
          </div>
          {days.map((day) => {
            const items = allOverlays.filter((it) => isSameLocalDay(it.date, day));
            return (
              <div
                key={day.toISOString()}
                className="min-h-[44px] border-l p-1 space-y-0.5"
              >
                {items.slice(0, 3).map((it) => (
                  <CalendarOverlayPill
                    key={it.id}
                    item={it}
                    onClick={(i) => onOverlayClick?.(i)}
                  />
                ))}
                {items.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{items.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div
          className="grid grid-cols-[60px_repeat(7,1fr)] overflow-y-auto"
          style={{ maxHeight: 600 }}
        >
          <div className="relative border-r" style={{ height: 24 * HOUR_HEIGHT }}>
            {DAY_HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 -translate-y-1/2 px-1.5 text-[10px] text-muted-foreground"
                style={{ top: h * HOUR_HEIGHT }}
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((day) => {
            const dayEvents = events.filter((e) => isSameLocalDay(e.start_at, day));
            return (
              <div
                key={day.toISOString()}
                className="relative border-r"
                style={{ height: 24 * HOUR_HEIGHT }}
              >
                {DAY_HOURS.map((h) => (
                  <DroppableSlot
                    key={h}
                    day={day}
                    hour={h}
                    onClick={() => {
                      const slot = new Date(day);
                      slot.setHours(h, 0, 0, 0);
                      onSlotClick(slot);
                    }}
                  />
                ))}
                {dayEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    size="sm"
                    style={eventBlockStyle(ev)}
                    onClick={() => onEventClick(ev)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}
