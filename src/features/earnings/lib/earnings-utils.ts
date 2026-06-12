import { differenceInCalendarDays, getDaysInMonth, isAfter, startOfMonth } from "date-fns";
import type { BookingOutcome, CompModel } from "@/shared/lib/types";

/** Monthly bonus tier: reach `threshold` qualifying bookings → flat `bonus`. */
export interface BonusTier {
  threshold: number;
  bonus: number;
}

/** bonus_tiers is jsonb — parse defensively and keep tiers sorted ascending. */
export function parseBonusTiers(raw: CompModel["bonus_tiers"]): BonusTier[] {
  if (!Array.isArray(raw)) return [];
  const tiers: BonusTier[] = [];
  for (const t of raw) {
    if (t && typeof t === "object" && !Array.isArray(t)) {
      const threshold = Number((t as Record<string, unknown>).threshold);
      const bonus = Number((t as Record<string, unknown>).bonus);
      if (Number.isFinite(threshold) && threshold > 0 && Number.isFinite(bonus) && bonus >= 0) {
        tiers.push({ threshold, bonus });
      }
    }
  }
  return tiers.sort((a, b) => a.threshold - b.threshold);
}

/** Highest tier reached at `count` qualifying bookings (non-cumulative). */
export function bonusFor(tiers: BonusTier[], count: number): number {
  let bonus = 0;
  for (const t of tiers) {
    if (count >= t.threshold) bonus = t.bonus;
  }
  return bonus;
}

/** The next tier above `count`, or null when all tiers are reached. */
export function nextTier(tiers: BonusTier[], count: number): BonusTier | null {
  for (const t of tiers) {
    if (count < t.threshold) return t;
  }
  return null;
}

export interface MonthBooking {
  held_at: string;
  outcome: BookingOutcome | null;
}

export interface EarningsBreakdown {
  /** Bookings in the month with outcome 'held'. */
  heldCount: number;
  /** Pending bookings (no outcome yet) scheduled in the month. */
  pendingCount: number;
  /** No-shows + cancellations in the month. */
  lostCount: number;
  /** held + pending — the commission-qualifying count if everything holds. */
  qualifyingCount: number;
  /** Run-rate projection of qualifying bookings at month end. */
  forecastCount: number;
  baseSalary: number;
  perBookingRate: number;
  tiers: BonusTier[];
  /** Commission + bonus from held bookings only. */
  confirmedCommission: number;
  confirmedBonus: number;
  /** Commission + bonus if every pending booking is held. */
  onBooksCommission: number;
  onBooksBonus: number;
  /** Total month-end pay forecast: base + forecast commission + forecast bonus. */
  forecastTotal: number;
  forecastBonus: number;
  next: BonusTier | null;
  /** Held bookings still missing to reach the next tier. */
  toNextTier: number | null;
}

/**
 * Earnings for the current month. A booking qualifies when it is scheduled
 * (held_at) in the month and not lost to a no-show/cancellation; commission
 * is confirmed once the outcome is registered as held. Forecast = the larger
 * of what is already on the books and the current run-rate projected over
 * the month (master prompt 3a).
 */
export function computeEarnings(
  model: { base_salary: number; per_booking_rate: number; bonus_tiers: CompModel["bonus_tiers"] },
  monthBookings: MonthBooking[],
  now = new Date(),
): EarningsBreakdown {
  const tiers = parseBonusTiers(model.bonus_tiers);
  const rate = Number(model.per_booking_rate) || 0;
  const base = Number(model.base_salary) || 0;

  let heldCount = 0;
  let pendingCount = 0;
  let lostCount = 0;
  let happenedSoFar = 0; // qualifying bookings already in the past
  for (const b of monthBookings) {
    if (b.outcome === "held") heldCount++;
    else if (b.outcome === "no_show" || b.outcome === "cancelled") lostCount++;
    else pendingCount++;
    if (b.outcome === "held" || (!b.outcome && !isAfter(new Date(b.held_at), now))) {
      happenedSoFar++;
    }
  }
  const qualifyingCount = heldCount + pendingCount;

  const elapsedDays = differenceInCalendarDays(now, startOfMonth(now)) + 1;
  const projection = Math.round((happenedSoFar / elapsedDays) * getDaysInMonth(now));
  const forecastCount = Math.max(qualifyingCount, projection);

  const confirmedBonus = bonusFor(tiers, heldCount);
  const onBooksBonus = bonusFor(tiers, qualifyingCount);
  const forecastBonus = bonusFor(tiers, forecastCount);

  const next = nextTier(tiers, heldCount);

  return {
    heldCount,
    pendingCount,
    lostCount,
    qualifyingCount,
    forecastCount,
    baseSalary: base,
    perBookingRate: rate,
    tiers,
    confirmedCommission: heldCount * rate,
    confirmedBonus,
    onBooksCommission: qualifyingCount * rate,
    onBooksBonus,
    forecastTotal: base + forecastCount * rate + forecastBonus,
    forecastBonus,
    next,
    toNextTier: next ? next.threshold - heldCount : null,
  };
}

/** Workspace-currency money formatter — never hardcode a currency. */
export function makeMoneyFormatter(locale: string, currency: string) {
  const fmt = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return (value: number) => fmt.format(value);
}

/** Pick the effective model: user-specific beats workspace default,
 * newest valid_from (<= today) wins within each group. Rows must be
 * pre-filtered to valid_from <= today. */
export function pickEffectiveModel(rows: CompModel[], userId: string): CompModel | null {
  let best: CompModel | null = null;
  for (const row of rows) {
    if (row.user_id !== null && row.user_id !== userId) continue;
    if (!best) {
      best = row;
      continue;
    }
    const bestSpecific = best.user_id !== null;
    const rowSpecific = row.user_id !== null;
    if (rowSpecific !== bestSpecific) {
      if (rowSpecific) best = row;
      continue;
    }
    if (row.valid_from > best.valid_from) best = row;
  }
  return best;
}
