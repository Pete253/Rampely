import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { chartTheme } from "../lib/chart-config";

interface Props {
  label: string;
  value: string;
  subValue?: string;
  pct: number;
  direction: "up" | "down" | "flat";
  sparkline: { day: string; value: number }[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function KpiCard({
  label,
  value,
  subValue,
  pct,
  direction,
  sparkline,
  loading,
  error,
  onRetry,
}: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive" className="border-0 p-0">
            <AlertDescription className="flex flex-col gap-2">
              <span className="text-xs">Failed to load</span>
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry} className="w-fit">
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-semibold tracking-tight">{value}</div>
              <TrendBadge pct={pct} direction={direction} />
            </div>
            {subValue && (
              <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
            )}
            <div className="mt-3 h-12 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkline} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartTheme.primary} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={chartTheme.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartTheme.primary}
                    strokeWidth={1.5}
                    fill={`url(#spark-${label})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TrendBadge({ pct, direction }: { pct: number; direction: "up" | "down" | "flat" }) {
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded text-xs font-medium px-1.5 py-0.5",
        direction === "up" && "bg-emerald-500/10 text-emerald-600",
        direction === "down" && "bg-red-500/10 text-red-600",
        direction === "flat" && "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
