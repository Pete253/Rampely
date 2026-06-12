import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarViewMode = "day" | "week" | "month";

const WEEK_OPTS = { weekStartsOn: 1 as const };

export function getRangeBounds(view: CalendarViewMode, anchor: Date) {
  if (view === "day") {
    return { from: startOfDay(anchor), to: endOfDay(anchor) };
  }
  if (view === "week") {
    return { from: startOfWeek(anchor, WEEK_OPTS), to: endOfWeek(anchor, WEEK_OPTS) };
  }
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  return {
    from: startOfWeek(monthStart, WEEK_OPTS),
    to: endOfWeek(monthEnd, WEEK_OPTS),
  };
}

export function shiftAnchor(view: CalendarViewMode, anchor: Date, dir: 1 | -1) {
  if (view === "day") return addDays(anchor, dir);
  if (view === "week") return addWeeks(anchor, dir);
  return addMonths(anchor, dir);
}

export function getRangeLabel(view: CalendarViewMode, anchor: Date) {
  if (view === "day") return format(anchor, "EEEE d. MMMM yyyy");
  if (view === "week") {
    const from = startOfWeek(anchor, WEEK_OPTS);
    const to = endOfWeek(anchor, WEEK_OPTS);
    if (isSameMonth(from, to)) {
      return `${format(from, "d.")}–${format(to, "d. MMMM yyyy")}`;
    }
    return `${format(from, "d. MMM")}–${format(to, "d. MMM yyyy")}`;
  }
  return format(anchor, "MMMM yyyy");
}

export function buildMonthGrid(anchor: Date): Date[] {
  const { from, to } = getRangeBounds("month", anchor);
  const days: Date[] = [];
  const total = differenceInCalendarDays(to, from) + 1;
  for (let i = 0; i < total; i++) days.push(addDays(from, i));
  return days;
}

export function buildWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, WEEK_OPTS);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const DAY_HOURS = Array.from({ length: 24 }, (_, i) => i);
export const VISIBLE_HOUR_START = 7;
export const VISIBLE_HOUR_END = 20;

export function eventTypeColor(t: "meeting" | "call" | "other") {
  if (t === "meeting") return "bg-primary text-primary-foreground border-blue-4";
  if (t === "call") return "bg-success text-ink border-success";
  return "bg-surface-2 text-white border-white/10";
}

export function eventTypeBadgeColor(t: "meeting" | "call" | "other") {
  if (t === "meeting") return "bg-primary/15 text-primary-light border-primary/30";
  if (t === "call") return "bg-success/15 text-success border-success/30";
  return "bg-white/10 text-white/70 border-white/15";
}

// === Custom colour palette ===
// Tailwind needs full static class strings — do NOT concatenate.
// Keys are stored on events in the DB and must stay stable; the visual
// mapping follows the Rampely palette (blue scale + semantic accents).
export interface PaletteEntry {
  key: string;
  label: string;
  swatchClass: string; // for the round selector swatch
  blockClass: string; // for the event block (bg + border + text)
  badgeClass: string; // for the small badge in popover
}

export const EVENT_COLOR_PALETTE: PaletteEntry[] = [
  {
    key: "blue",
    label: "Blue",
    swatchClass: "bg-primary",
    blockClass: "bg-primary text-white border-blue-4",
    badgeClass: "bg-primary/15 text-primary-light border-primary/30",
  },
  {
    key: "green",
    label: "Green",
    swatchClass: "bg-success",
    blockClass: "bg-success text-ink border-success",
    badgeClass: "bg-success/15 text-success border-success/30",
  },
  {
    key: "amber",
    label: "Amber",
    swatchClass: "bg-warning",
    blockClass: "bg-warning text-ink border-warning",
    badgeClass: "bg-warning/15 text-warning border-warning/30",
  },
  {
    key: "red",
    label: "Red",
    swatchClass: "bg-danger",
    blockClass: "bg-danger text-white border-danger",
    badgeClass: "bg-danger/15 text-danger border-danger/30",
  },
  {
    key: "purple",
    label: "Periwinkle",
    swatchClass: "bg-blue-5",
    blockClass: "bg-blue-5 text-ink border-blue-5",
    badgeClass: "bg-blue-5/15 text-blue-5 border-blue-5/30",
  },
  {
    key: "pink",
    label: "Light blue",
    swatchClass: "bg-primary-light",
    blockClass: "bg-primary-light text-ink border-primary-light",
    badgeClass: "bg-primary-light/15 text-primary-light border-primary-light/30",
  },
  {
    key: "teal",
    label: "Sky",
    swatchClass: "bg-blue-3",
    blockClass: "bg-blue-3 text-white border-blue-3",
    badgeClass: "bg-blue-3/15 text-blue-3 border-blue-3/30",
  },
  {
    key: "grey",
    label: "Slate",
    swatchClass: "bg-white/25",
    blockClass: "bg-white/20 text-white border-white/10",
    badgeClass: "bg-white/10 text-white/70 border-white/15",
  },
];

export function getPaletteEntry(key: string | null | undefined): PaletteEntry | null {
  if (!key) return null;
  return EVENT_COLOR_PALETTE.find((p) => p.key === key) ?? null;
}

export function resolveEventColor(event: {
  color?: string | null;
  event_type: "meeting" | "call" | "other";
}): string {
  const palette = getPaletteEntry(event.color);
  if (palette) return palette.blockClass;
  return eventTypeColor(event.event_type);
}

export function resolveEventBadgeColor(event: {
  color?: string | null;
  event_type: "meeting" | "call" | "other";
}): string {
  const palette = getPaletteEntry(event.color);
  if (palette) return palette.badgeClass;
  return eventTypeBadgeColor(event.event_type);
}

export function formatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "HH:mm");
}

export function formatDuration(start: Date | string, end: Date | string) {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  const ms = e.getTime() - s.getTime();
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function relativeDueLabel(
  due: string | null | undefined,
  opts?: { done?: boolean },
): {
  label: string;
  overdue: boolean;
  soon: boolean;
} | null {
  if (!due) return null;
  const date = new Date(due);
  const today = startOfDay(new Date());
  const diff = differenceInCalendarDays(startOfDay(date), today);
  if (diff < 0) {
    if (opts?.done) {
      return { label: format(date, "d. MMM"), overdue: false, soon: false };
    }
    const n = Math.abs(diff);
    return {
      label: n === 1 ? "Overdue by 1 day" : `Overdue by ${n} days`,
      overdue: true,
      soon: false,
    };
  }
  if (diff === 0) return { label: "Today", overdue: false, soon: true };
  if (diff === 1) return { label: "Tomorrow", overdue: false, soon: true };
  if (diff < 7) return { label: `In ${diff} days`, overdue: false, soon: diff <= 2 };
  return { label: format(date, "d. MMM"), overdue: false, soon: false };
}

export function priorityColor(p: "low" | "medium" | "high") {
  if (p === "high") return "bg-danger/15 text-danger border-danger/30";
  if (p === "medium") return "bg-warning/15 text-warning border-warning/30";
  return "bg-success/15 text-success border-success/30";
}

export function isSameLocalDay(a: Date | string, b: Date | string) {
  const da = typeof a === "string" ? new Date(a) : a;
  const db = typeof b === "string" ? new Date(b) : b;
  return isSameDay(da, db);
}

export const weekStartsOn = WEEK_OPTS.weekStartsOn;
