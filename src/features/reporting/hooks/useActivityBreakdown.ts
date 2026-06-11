import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export interface ActivityBreakdownRow {
  type: "call" | "email" | "meeting" | "note" | "task";
  count: number;
}

export function useActivityBreakdown({ from, to }: { from: Date; to: Date }) {
  const { workspace } = useWorkspace();
  const [data, setData] = useState<ActivityBreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase.rpc("rpt_activity_breakdown", {
        _workspace_id: workspace.id,
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (err) throw err;
      setData((rows ?? []).map((r: ActivityBreakdownRow) => ({ type: r.type, count: Number(r.count) })));
    } catch (e) {
      setError((e as Error).message ?? "Failed to load activity breakdown");
    } finally {
      setLoading(false);
    }
  }, [workspace, from, to]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
