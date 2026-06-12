import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export interface AiUsageStats {
  monthSpendDkk: number;
  scoredCalls: number;
  deepAnalyses: number;
  avgPerScoredCallDkk: number | null;
}

/**
 * Month-to-date AI spend for the workspace plus the configurable cost cap
 * (master build prompt §5/2b unit-economics gate). Admin-only by RLS — reps
 * only see their own score rows, so this hook lives behind the admin tab.
 */
export function useAiUsage() {
  const { workspace, refresh: refreshWorkspace } = useWorkspace();
  const [stats, setStats] = useState<AiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("call_scores")
      .select("layer, cost_dkk")
      .eq("workspace_id", workspace.id)
      .gte("created_at", monthStart.toISOString());
    if (error) {
      console.error("Failed to load AI usage", error);
      setStats(null);
    } else {
      const rows = data ?? [];
      const scored = rows.filter((r) => r.layer === 3);
      const scoredSpend = scored.reduce((s, r) => s + Number(r.cost_dkk), 0);
      setStats({
        monthSpendDkk: rows.reduce((s, r) => s + Number(r.cost_dkk), 0),
        scoredCalls: scored.length,
        deepAnalyses: rows.filter((r) => r.layer === 4).length,
        avgPerScoredCallDkk: scored.length > 0 ? scoredSpend / scored.length : null,
      });
    }
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveCap = useCallback(
    async (capDkk: number) => {
      if (!workspace) throw new Error("Not ready");
      const { error } = await supabase
        .from("workspaces")
        .update({ ai_cost_cap_dkk: capDkk })
        .eq("id", workspace.id);
      if (error) throw error;
      await refreshWorkspace();
    },
    [workspace, refreshWorkspace],
  );

  return { stats, loading, capDkk: workspace?.ai_cost_cap_dkk ?? 1, refresh, saveCap };
}
