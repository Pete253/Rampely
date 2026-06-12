import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { BarChart3 } from "lucide-react";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { EmptyState } from "@/shared/components/EmptyState";
import { ReportsHeader } from "./ReportsHeader";
import { KpiCard } from "./KpiCard";
import { PipelineByStageChart } from "./PipelineByStageChart";
import { DealVelocityChart } from "./DealVelocityChart";
import { ActivityBreakdownChart } from "./ActivityBreakdownChart";
import { DealsCreatedVsClosedChart } from "./DealsCreatedVsClosedChart";
import { TeamLeaderboard } from "./TeamLeaderboard";
import { DrillDownList, type DrillDown } from "./DrillDownList";
import { useReportMetrics } from "../hooks/useReportMetrics";
import {
  formatDKK,
  formatCompactDKK,
  pctChange,
  resolveRange,
  type RangePreset,
} from "../lib/reporting-utils";

interface Props {
  preset: RangePreset;
  customFrom?: string;
  customTo?: string;
}

export function ReportsView({ preset, customFrom, customTo }: Props) {
  const navigate = useNavigate({ from: "/reports" });
  const { workspace } = useWorkspace();
  const range = useMemo(
    () => resolveRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const [drilldown, setDrilldown] = useState<DrillDown | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const { summary, sparklines, loading, error, refetch } = useReportMetrics({
    from: range.from,
    to: range.to,
    prevFrom: range.prevFrom,
    prevTo: range.prevTo,
  });

  const totalPct = pctChange(
    summary?.total_pipeline_value ?? 0,
    summary?.total_pipeline_value_prev ?? 0,
  );
  const weightedPct = pctChange(
    summary?.weighted_pipeline_value ?? 0,
    summary?.weighted_pipeline_value_prev ?? 0,
  );
  const wonPct = pctChange(summary?.deals_won_count ?? 0, summary?.deals_won_count_prev ?? 0);
  const actsPct = pctChange(summary?.activities_count ?? 0, summary?.activities_count_prev ?? 0);

  return (
    <div className="space-y-4">
      <ReportsHeader
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        rangeSlug={range.slug}
        dashboardRef={dashboardRef}
        setIsExporting={setIsExporting}
        onChange={(next) => {
          navigate({
            search: () => ({
              range: next.preset,
              from: next.from,
              to: next.to,
            }),
          });
        }}
      />

      <div ref={dashboardRef} id="reports-dashboard" className="space-y-4 bg-background">
        {isExporting && (
          <div
            style={{
              padding: "24px",
              background: "#13152E",
              borderBottom: "1px solid rgba(255,255,255,0.12)",
              fontFamily: "Manrope, system-ui, sans-serif",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  letterSpacing: "-0.03em",
                }}
              >
                Rampely
              </div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>
                {workspace?.name ?? "Workspace"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#C7CFF3" }}>
                {range.label}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                Generated {format(new Date(), "dd MMM yyyy, HH:mm")}
              </div>
            </div>
          </div>
        )}

        {summary &&
          !loading &&
          summary.total_pipeline_value === 0 &&
          summary.weighted_pipeline_value === 0 &&
          summary.deals_won_count === 0 &&
          summary.activities_count === 0 && (
            <EmptyState
              icon={BarChart3}
              title="No data in this range"
              description="Try a wider date range or create a deal to see metrics."
            />
          )}

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Pipeline"
            value={formatCompactDKK(summary?.total_pipeline_value ?? 0)}
            pct={totalPct.pct}
            direction={totalPct.direction}
            sparkline={sparklines.map((p) => ({ day: p.day, value: p.pipeline_value }))}
            loading={loading}
            error={error}
            onRetry={refetch}
          />
          <KpiCard
            label="Weighted Pipeline"
            value={formatCompactDKK(summary?.weighted_pipeline_value ?? 0)}
            pct={weightedPct.pct}
            direction={weightedPct.direction}
            sparkline={sparklines.map((p) => ({ day: p.day, value: p.weighted_value }))}
            loading={loading}
            error={error}
            onRetry={refetch}
          />
          <KpiCard
            label="Deals Won"
            value={String(summary?.deals_won_count ?? 0)}
            subValue={formatDKK(summary?.deals_won_value ?? 0)}
            pct={wonPct.pct}
            direction={wonPct.direction}
            sparkline={sparklines.map((p) => ({ day: p.day, value: p.deals_won }))}
            loading={loading}
            error={error}
            onRetry={refetch}
          />
          <KpiCard
            label="Activities Logged"
            value={String(summary?.activities_count ?? 0)}
            pct={actsPct.pct}
            direction={actsPct.direction}
            sparkline={sparklines.map((p) => ({ day: p.day, value: p.activities }))}
            loading={loading}
            error={error}
            onRetry={refetch}
          />
        </div>

        {/* Main charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PipelineByStageChart
            onStageClick={(stageId, stageName) =>
              setDrilldown({ kind: "deals", stageId, stageName })
            }
          />
          <DealVelocityChart from={range.from} to={range.to} />
        </div>

        {/* Secondary charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActivityBreakdownChart
            from={range.from}
            to={range.to}
            onTypeClick={(type) =>
              setDrilldown({
                kind: "activities",
                type,
                from: range.from.toISOString(),
                to: range.to.toISOString(),
              })
            }
          />
          <DealsCreatedVsClosedChart from={range.from} to={range.to} />
        </div>

        {/* Leaderboard */}
        <TeamLeaderboard from={range.from} to={range.to} />

        {/* Drill-down */}
        {drilldown && <DrillDownList drilldown={drilldown} onClear={() => setDrilldown(null)} />}
      </div>
    </div>
  );
}
