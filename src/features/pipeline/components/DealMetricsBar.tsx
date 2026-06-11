import { differenceInCalendarDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { formatDKK, closeDateColor } from "../lib/pipeline-utils";
import type { DealDetailData } from "../hooks/useDeal";

interface Props {
  deal: DealDetailData;
  daysInStage: number;
}

export function DealMetricsBar({ deal, daysInStage }: Props) {
  const value = Number(deal.value ?? 0);
  const probability = deal.stage?.probability ?? 0;
  const weighted = value * (probability / 100);
  const daysOpen = Math.max(
    0,
    differenceInCalendarDays(new Date(), new Date(deal.created_at)),
  );
  const dotColor = closeDateColor(deal.expected_close_date);
  const dotClass =
    dotColor === "green"
      ? "bg-emerald-500"
      : dotColor === "amber"
        ? "bg-amber-500"
        : dotColor === "red"
          ? "bg-red-500"
          : "bg-muted";

  const items: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Value", value: formatDKK(value) },
    { label: "Weighted", value: formatDKK(weighted) },
    { label: "Probability", value: `${probability}%` },
    { label: "Days in stage", value: `${daysInStage}d` },
    { label: "Days open", value: `${daysOpen}d` },
    {
      label: "Expected close",
      value: (
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", dotClass)} />
          <span>
            {deal.expected_close_date
              ? format(new Date(deal.expected_close_date), "MMM d, yyyy")
              : "—"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((m) => (
          <div key={m.label} className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {m.label}
            </div>
            <div className="text-sm font-semibold">{m.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
