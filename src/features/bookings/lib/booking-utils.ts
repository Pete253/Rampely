import { isBefore, startOfWeek } from "date-fns";
import type { BookingOutcome } from "@/shared/lib/types";
import type { BookingRecord } from "../hooks/useBookings";

/** Derived display status: outcome registered, or pending (upcoming vs. overdue). */
export type BookingStatus = "upcoming" | "needs_outcome" | BookingOutcome;

export function bookingStatus(b: {
  held_at: string;
  outcome: BookingOutcome | null;
}): BookingStatus {
  if (b.outcome) return b.outcome;
  return isBefore(new Date(b.held_at), new Date()) ? "needs_outcome" : "upcoming";
}

export interface OutcomeMeta {
  label: string;
  badgeClass: string;
}

// Tints follow the design-system semantic palette.
export const OUTCOME_META: Record<BookingOutcome, OutcomeMeta> = {
  held: { label: "Held", badgeClass: "bg-success/15 text-success border-success/30" },
  no_show: { label: "No-show", badgeClass: "bg-danger/15 text-danger border-danger/30" },
  cancelled: { label: "Cancelled", badgeClass: "bg-white/10 text-white/70 border-white/15" },
};

export const STATUS_META: Record<BookingStatus, OutcomeMeta> = {
  ...OUTCOME_META,
  upcoming: { label: "Upcoming", badgeClass: "bg-primary/15 text-primary-light border-primary/30" },
  needs_outcome: {
    label: "Needs outcome",
    badgeClass: "bg-warning/15 text-warning border-warning/30",
  },
};

export interface BookingStats {
  bookedThisWeek: number;
  awaitingOutcome: number;
  heldRate: number | null; // held / (held + no_show); null when nothing registered
}

/** Week starts Monday, matching the calendar feature. */
export function computeBookingStats(bookings: BookingRecord[], now = new Date()): BookingStats {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  let bookedThisWeek = 0;
  let awaitingOutcome = 0;
  let held = 0;
  let noShow = 0;
  for (const b of bookings) {
    if (new Date(b.created_at) >= weekStart) bookedThisWeek++;
    if (!b.outcome && isBefore(new Date(b.held_at), now)) awaitingOutcome++;
    if (b.outcome === "held") held++;
    if (b.outcome === "no_show") noShow++;
  }
  const denominator = held + noShow;
  return {
    bookedThisWeek,
    awaitingOutcome,
    heldRate: denominator > 0 ? held / denominator : null,
  };
}
