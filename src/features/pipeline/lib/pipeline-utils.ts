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

export const STAGE_COLOR_PRESETS = [
  "#64748b", // slate
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#14b8a6", // teal
] as const;

export const DEFAULT_STAGES: Array<{
  name: string;
  color: string;
  probability: number;
  stage_type: "open" | "won" | "lost";
}> = [
  { name: "Lead", color: "#64748b", probability: 10, stage_type: "open" },
  { name: "Qualified", color: "#3b82f6", probability: 25, stage_type: "open" },
  { name: "Proposal", color: "#8b5cf6", probability: 50, stage_type: "open" },
  { name: "Negotiation", color: "#f59e0b", probability: 75, stage_type: "open" },
  { name: "Won", color: "#10b981", probability: 100, stage_type: "won" },
  { name: "Lost", color: "#ef4444", probability: 0, stage_type: "lost" },
];
