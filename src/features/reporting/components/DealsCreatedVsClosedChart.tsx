import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { useDealsCreatedVsClosed } from "../hooks/useDealsCreatedVsClosed";
import { chartTheme, tooltipCursor, tooltipStyle } from "../lib/chart-config";

interface Props {
  from: Date;
  to: Date;
}

export function DealsCreatedVsClosedChart({ from, to }: Props) {
  const { data, loading, error, refetch } = useDealsCreatedVsClosed({ from, to });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Deals Created vs. Closed</CardTitle>
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
            No deal activity in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="week_start"
                tick={{ fontSize: chartTheme.fontSize, fill: chartTheme.axis }}
                tickFormatter={(d) => format(new Date(d), "dd MMM")}
              />
              <YAxis
                tick={{ fontSize: chartTheme.fontSize, fill: chartTheme.axis }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={tooltipCursor}
                labelFormatter={(d) => format(new Date(d as string), "dd MMM yyyy")}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="created_count"
                name="Created"
                fill={chartTheme.created}
                radius={[3, 3, 0, 0]}
              />
              <Bar dataKey="won_count" name="Won" fill={chartTheme.won} radius={[3, 3, 0, 0]} />
              <Bar dataKey="lost_count" name="Lost" fill={chartTheme.lost} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
