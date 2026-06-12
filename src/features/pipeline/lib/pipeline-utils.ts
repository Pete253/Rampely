import { differenceInCalendarDays } from "date-fns";
import type { Deal, PipelineStage } from "@/shared/lib/types";

const DKK_FORMATTER = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0,
});

export function formatDKK(value: number | null | undefined): string {
  return DKK_FORMATTER.format(Number(value ?? 0));
}

export function weightedValue(deals: Deal[], stages: PipelineStage[]): number {
  const probMap = new Map(stages.map((s) => [s.id, s.probability ?? 0]));
  return deals.reduce((sum, d) => {
    const prob = (probMap.get(d.stage_id) ?? 0) / 100;
    return sum + Number(d.value ?? 0) * prob;
  }, 0);
}

export function totalValue(deals: Deal[]): number {
  return deals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
}

export function daysInStage(deal: Deal, lastMoveAt: string | null): number {
  const start = lastMoveAt ? new Date(lastMoveAt) : new Date(deal.created_at);
  return Math.max(0, differenceInCalendarDays(new Date(), start));
}

export type CloseDateColor = "green" | "amber" | "red" | null;

export function closeDateColor(date: string | null | undefined): CloseDateColor {
  if (!date) return null;
  const days = differenceInCalendarDays(new Date(date), new Date());
  if (days < 0) return "red";
  if (days <= 7) return "amber";
  return "green";
}

// Rampely design-system palette: blue scale plus semantic accents.
export const STAGE_COLOR_PRESETS = [
  "#8B99F0", // blue-5
  "#6B7FFF", // blue-3
  "#4759E8", // blue-1 (primary)
  "#2D3AB0", // blue-2
  "#C7CFF3", // primary light
  "#FEBC2E", // warning
  "#28C840", // success
  "#FF5F57", // danger
] as const;

export const DEFAULT_STAGES: Array<{
  name: string;
  color: string;
  probability: number;
  stage_type: "open" | "won" | "lost";
}> = [
  { name: "Lead", color: "#8B99F0", probability: 10, stage_type: "open" },
  { name: "Qualified", color: "#6B7FFF", probability: 25, stage_type: "open" },
  { name: "Proposal", color: "#4759E8", probability: 50, stage_type: "open" },
  { name: "Negotiation", color: "#FEBC2E", probability: 75, stage_type: "open" },
  { name: "Won", color: "#28C840", probability: 100, stage_type: "won" },
  { name: "Lost", color: "#FF5F57", probability: 0, stage_type: "lost" },
];
