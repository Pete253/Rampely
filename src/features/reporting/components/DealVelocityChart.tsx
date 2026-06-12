import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { useDealVelocity } from "../hooks/useDealVelocity";
import { chartTheme, tooltipStyle } from "../lib/chart-config";

interface Props {
  from: Date;
  to: Date;
}

export function DealVelocityChart({ from, to }: Props) {
  const { data, loading, error, refetch } = useDealVelocity({ from, to });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Deal Velocity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>Failed to load chart</span>
              <Button size="sm" variant="outline" onClick={refetch}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No closed deals in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="week_start"
                tick={{ fontSize: chartTheme.fontSize, fill: chartTheme.axis }}
                tickFormatter={(d) => format(new Date(d), "dd MMM")}
              />
              <YAxis
                tick={{ fontSize: chartTheme.fontSize, fill: chartTheme.axis }}
                label={{
                  value: "Avg days",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                  fill: chartTheme.axis,
                }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(d) => format(new Date(d as string), "dd MMM yyyy")}
                formatter={(v: number, name: string, item) => {
                  const isWon = name === "Won";
                  const count = isWon ? item.payload.won_count : item.payload.lost_count;
                  return [`${Number(v ?? 0).toFixed(1)} days · ${count} deal(s)`, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="won_avg_days"
                name="Won"
                stroke={chartTheme.won}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="lost_avg_days"
                name="Lost"
                stroke={chartTheme.lost}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
