import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export interface StageRow {
  stage_id: string;
  stage_name: string;
  color: string | null;
  sort_order: number;
  total_value: number;
  deal_count: number;
}

export function usePipelineByStage() {
  const { workspace } = useWorkspace();
  const [data, setData] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase.rpc("rpt_pipeline_by_stage", {
        _workspace_id: workspace.id,
      });
      if (err) throw err;
      setData(
        (rows ?? []).map((r: StageRow) => ({
          ...r,
          total_value: Number(r.total_value),
          deal_count: Number(r.deal_count),
        })),
      );
    } catch (e) {
      setError((e as Error).message ?? "Failed to load pipeline data");
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
