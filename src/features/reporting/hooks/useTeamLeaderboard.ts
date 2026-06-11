import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export interface LeaderboardRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  deals_won: number;
  won_value: number;
  calls_logged: number;
  meetings_booked: number;
  tasks_completed: number;
  activity_score: number;
}

export function useTeamLeaderboard({ from, to }: { from: Date; to: Date }) {
  const { workspace } = useWorkspace();
  const [data, setData] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase.rpc("rpt_team_leaderboard", {
        _workspace_id: workspace.id,
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (err) throw err;
      setData(
        (rows ?? []).map((r: LeaderboardRow) => ({
          ...r,
          deals_won: Number(r.deals_won),
          won_value: Number(r.won_value),
          calls_logged: Number(r.calls_logged),
          meetings_booked: Number(r.meetings_booked),
          tasks_completed: Number(r.tasks_completed),
          activity_score: Number(r.activity_score),
        })),
      );
    } catch (e) {
      setError((e as Error).message ?? "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [workspace, from, to]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
