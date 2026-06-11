import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export interface KpiSummary {
  total_pipeline_value: number;
  weighted_pipeline_value: number;
  deals_won_count: number;
  deals_won_value: number;
  activities_count: number;
  total_pipeline_value_prev: number;
  weighted_pipeline_value_prev: number;
  deals_won_count_prev: number;
  deals_won_value_prev: number;
  activities_count_prev: number;
}

export interface SparklinePoint {
  day: string;
  pipeline_value: number;
  weighted_value: number;
  deals_won: number;
  activities: number;
}

interface Args {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
}

export function useReportMetrics({ from, to, prevFrom, prevTo }: Args) {
  const { workspace } = useWorkspace();
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [sparklines, setSparklines] = useState<SparklinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const [s, sp] = await Promise.all([
        supabase.rpc("rpt_kpi_summary", {
          _workspace_id: workspace.id,
          _from: from.toISOString(),
          _to: to.toISOString(),
          _prev_from: prevFrom.toISOString(),
          _prev_to: prevTo.toISOString(),
        }),
        supabase.rpc("rpt_kpi_sparklines", {
          _workspace_id: workspace.id,
          _from: from.toISOString(),
          _to: to.toISOString(),
        }),
      ]);
      if (s.error) throw s.error;
      if (sp.error) throw sp.error;
      const row = (s.data?.[0] ?? null) as KpiSummary | null;
      setSummary(
        row
          ? {
              total_pipeline_value: Number(row.total_pipeline_value),
              weighted_pipeline_value: Number(row.weighted_pipeline_value),
              deals_won_count: Number(row.deals_won_count),
              deals_won_value: Number(row.deals_won_value),
              activities_count: Number(row.activities_count),
              total_pipeline_value_prev: Number(row.total_pipeline_value_prev),
              weighted_pipeline_value_prev: Number(row.weighted_pipeline_value_prev),
              deals_won_count_prev: Number(row.deals_won_count_prev),
              deals_won_value_prev: Number(row.deals_won_value_prev),
              activities_count_prev: Number(row.activities_count_prev),
            }
          : null,
      );
      setSparklines(
        (sp.data ?? []).map((r: SparklinePoint) => ({
          day: r.day,
          pipeline_value: Number(r.pipeline_value),
          weighted_value: Number(r.weighted_value),
          deals_won: Number(r.deals_won),
          activities: Number(r.activities),
        })),
      );
    } catch (e) {
      setError((e as Error).message ?? "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [workspace, from, to, prevFrom, prevTo]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { summary, sparklines, loading, error, refetch: fetchAll };
}
