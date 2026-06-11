import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  differenceInMilliseconds,
  format,
} from "date-fns";

export type RangePreset = "today" | "week" | "month" | "quarter" | "year" | "custom";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

const WEEK_OPTS = { weekStartsOn: 1 as const };

export interface ResolvedRange {
  from: Date;
  to: Date; // exclusive
  prevFrom: Date;
  prevTo: Date;
  label: string;
  slug: string;
}

export function resolveRange(
  preset: RangePreset,
  customFrom?: string,
  customTo?: string,
): ResolvedRange {
  const now = new Date();
  let from: Date;
  let to: Date;
  let prevFrom: Date;
  let prevTo: Date;

  switch (preset) {
    case "today":
      from = startOfDay(now);
      to = endOfDay(now);
      prevFrom = startOfDay(subDays(now, 1));
      prevTo = endOfDay(subDays(now, 1));
      break;
    case "week":
      from = startOfWeek(now, WEEK_OPTS);
      to = endOfWeek(now, WEEK_OPTS);
      prevFrom = startOfWeek(subWeeks(now, 1), WEEK_OPTS);
      prevTo = endOfWeek(subWeeks(now, 1), WEEK_OPTS);
      break;
    case "quarter":
      from = startOfQuarter(now);
      to = endOfQuarter(now);
      prevFrom = startOfQuarter(subQuarters(now, 1));
      prevTo = endOfQuarter(subQuarters(now, 1));
      break;
    case "year":
      from = startOfYear(now);
      to = endOfYear(now);
      prevFrom = startOfYear(subYears(now, 1));
      prevTo = endOfYear(subYears(now, 1));
      break;
    case "custom": {
      const f = customFrom ? new Date(customFrom) : startOfMonth(now);
      const t = customTo ? new Date(customTo) : endOfMonth(now);
      from = startOfDay(f);
      to = endOfDay(t);
      const span = differenceInMilliseconds(to, from);
      prevTo = new Date(from.getTime() - 1);
      prevFrom = new Date(prevTo.getTime() - span);
      break;
    }
    case "month":
    default:
      from = startOfMonth(now);
      to = endOfMonth(now);
      prevFrom = startOfMonth(subMonths(now, 1));
      prevTo = endOfMonth(subMonths(now, 1));
      break;
  }

  return {
    from,
    to,
    prevFrom,
    prevTo,
    label: formatRangeLabel(from, to),
    slug: rangeSlug(preset, from, to),
  };
}

export function formatRangeLabel(from: Date, to: Date): string {
  return `${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`;
}

export function rangeSlug(preset: RangePreset, from: Date, to: Date): string {
  if (preset === "custom") {
    return `${format(from, "yyyy-MM-dd")}_to_${format(to, "yyyy-MM-dd")}`;
  }
  return preset.replace(/\s+/g, "-");
}

const DKK = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0,
});

export function formatDKK(value: number | null | undefined): string {
  return DKK.format(Number(value ?? 0));
}

export function formatCompactDKK(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M kr.`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k kr.`;
  return `${n.toFixed(0)} kr.`;
}

export function pctChange(
  current: number,
  previous: number,
): { pct: number; direction: "up" | "down" | "flat" } {
  if (!previous && !current) return { pct: 0, direction: "flat" };
  if (!previous) return { pct: 100, direction: "up" };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const direction = pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  return { pct, direction };
}

export const ACTIVITY_SCORE_WEIGHTS = {
  dealWon: 10,
  wonValuePerUnit: 10000,
  call: 2,
  meeting: 3,
  taskCompleted: 1,
} as const;
