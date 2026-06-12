import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { usePipelineByStage } from "../hooks/usePipelineByStage";
import { chartTheme, tooltipCursor, tooltipStyle } from "../lib/chart-config";
import { formatCompactDKK, formatDKK } from "../lib/reporting-utils";

interface Props {
  onStageClick?: (stageId: string, stageName: string) => void;
}

const STAGE_FALLBACK = ["#4759E8", "#6B7FFF", "#8B99F0", "#2D3AB0", "#28C840", "#FEBC2E"];

export function PipelineByStageChart({ onStageClick }: Props) {
  const { data, loading, error, refetch } = usePipelineByStage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <ErrorBlock onRetry={refetch} />
        ) : data.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: chartTheme.fontSize, fill: chartTheme.axis }}
                tickFormatter={(v) => formatCompactDKK(Number(v))}
              />
              <YAxis
                type="category"
                dataKey="stage_name"
                width={100}
                tick={{ fontSize: chartTheme.fontSize, fill: chartTheme.axis }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={tooltipCursor}
                formatter={(v: number) => [formatDKK(Number(v)), "Value"]}
              />
              <Bar
                dataKey="total_value"
                cursor={onStageClick ? "pointer" : undefined}
                onClick={(d) => onStageClick?.(d.stage_id, d.stage_name)}
                radius={[0, 4, 4, 0]}
              >
                {data.map((d, i) => (
                  <Cell
                    key={d.stage_id}
                    fill={d.color || STAGE_FALLBACK[i % STAGE_FALLBACK.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex items-center justify-between gap-2">
        <span>Failed to load chart</span>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function Empty() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      No deals in this range
    </div>
  );
}
