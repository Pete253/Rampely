import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";

export interface StageHistoryEntry {
  id: string;
  stage_id: string;
  entered_at: string;
  exited_at: string | null;
  stage: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

export function useDealStageHistory(dealId: string | undefined) {
  const [entries, setEntries] = useState<StageHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!dealId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("deal_stage_history" as never)
      .select("id, stage_id, entered_at, exited_at, stage:pipeline_stages(id, name, color)")
      .eq("deal_id", dealId)
      .order("entered_at", { ascending: true });
    if (error) {
      console.error("Failed to load stage history", error);
      setEntries([]);
    } else {
      setEntries((data as unknown as StageHistoryEntry[]) ?? []);
    }
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}
