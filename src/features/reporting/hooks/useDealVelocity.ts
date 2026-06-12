import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

interface VelocityRow {
  week_start: string;
  status: "won" | "lost";
  deals_count: number;
  avg_days: number;
}

export interface VelocityPoint {
  week_start: string;
  won_count: number;
  won_avg_days: number | null;
  lost_count: number;
  lost_avg_days: number | null;
}

export function useDealVelocity({ from, to }: { from: Date; to: Date }) {
  const { workspace } = useWorkspace();
  const [data, setData] = useState<VelocityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase.rpc("rpt_deal_velocity", {
        _workspace_id: workspace.id,
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (err) throw err;
      const map = new Map<string, VelocityPoint>();
      for (const r of (rows ?? []) as VelocityRow[]) {
        const key = r.week_start;
        const existing = map.get(key) ?? {
          week_start: key,
          won_count: 0,
          won_avg_days: null,
          lost_count: 0,
          lost_avg_days: null,
        };
        if (r.status === "won") {
          existing.won_count = Number(r.deals_count);
          existing.won_avg_days = Number(r.avg_days);
        } else if (r.status === "lost") {
          existing.lost_count = Number(r.deals_count);
          existing.lost_avg_days = Number(r.avg_days);
        }
        map.set(key, existing);
      }
      setData([...map.values()].sort((a, b) => a.week_start.localeCompare(b.week_start)));
    } catch (e) {
      setError((e as Error).message ?? "Failed to load velocity data");
    } finally {
      setLoading(false);
    }
  }, [workspace, from, to]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
