import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useActivityBreakdown } from "../hooks/useActivityBreakdown";
import { ACTIVITY_COLORS, tooltipStyle } from "../lib/chart-config";

interface Props {
  from: Date;
  to: Date;
  onTypeClick?: (type: string) => void;
}

export function ActivityBreakdownChart({ from, to, onTypeClick }: Props) {
  const { data, loading, error, refetch } = useActivityBreakdown({ from, to });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Breakdown</CardTitle>
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
            No activities in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="type"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                onClick={(d) => onTypeClick?.((d as { type: string }).type)}
                cursor={onTypeClick ? "pointer" : undefined}
              >
                {data.map((d) => (
                  <Cell key={d.type} fill={ACTIVITY_COLORS[d.type] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value, entry) => {
                  const item = entry.payload as unknown as { count: number };
                  return `${value} · ${item.count}`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
