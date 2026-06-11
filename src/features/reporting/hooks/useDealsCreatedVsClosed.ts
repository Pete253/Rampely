import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export interface CreatedVsClosedRow {
  week_start: string;
  created_count: number;
  won_count: number;
  lost_count: number;
}

export function useDealsCreatedVsClosed({ from, to }: { from: Date; to: Date }) {
  const { workspace } = useWorkspace();
  const [data, setData] = useState<CreatedVsClosedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase.rpc("rpt_deals_created_vs_closed", {
        _workspace_id: workspace.id,
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (err) throw err;
      setData(
        (rows ?? []).map((r: CreatedVsClosedRow) => ({
          week_start: r.week_start,
          created_count: Number(r.created_count),
          won_count: Number(r.won_count),
          lost_count: Number(r.lost_count),
        })),
      );
    } catch (e) {
      setError((e as Error).message ?? "Failed to load deal flow");
    } finally {
      setLoading(false);
    }
  }, [workspace, from, to]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
