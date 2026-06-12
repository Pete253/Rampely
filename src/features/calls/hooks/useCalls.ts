import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { CallWithScores } from "../lib/call-scoring";

const PAGE_SIZE = 100;
const POLL_MS = 12_000;

/**
 * The rep's call history with embedded scores. While any call is still being
 * transcribed/scored the list polls so results appear without a manual
 * refresh (the pipeline runs server-side off the recording webhook).
 */
export function useCalls(scope: "mine" | "all") {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [calls, setCalls] = useState<CallWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (silent = false) => {
      if (!workspace || !user) return;
      if (!silent) setLoading(true);
      let query = supabase
        .from("calls")
        .select("*, call_scores(*), contact:contacts(id, first_name, last_name)")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (scope === "mine") query = query.eq("user_id", user.id);
      const { data, error: err } = await query;
      if (err) {
        console.error("Failed to load calls", err);
        setError(err.message);
      } else {
        setError(null);
        setCalls((data ?? []) as unknown as CallWithScores[]);
      }
      setLoading(false);
    },
    [workspace, user, scope],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasInFlight = useMemo(
    () => calls.some((c) => ["pending", "processing"].includes(c.transcript_status)),
    [calls],
  );

  useEffect(() => {
    if (!hasInFlight) return;
    const id = setInterval(() => void refresh(true), POLL_MS);
    return () => clearInterval(id);
  }, [hasInFlight, refresh]);

  /** Trigger Layer 2+3 (scoreNow) or Layer 4 (deep) for one call. */
  const analyze = useCallback(
    async (callId: string, layer: 3 | 4 = 3) => {
      const { data, error: err } = await supabase.functions.invoke("call-intelligence", {
        body: { callId, layer },
      });
      if (err) throw new Error(err.message);
      if (!data?.ok) {
        const messages: Record<string, string> = {
          not_configured: "AI keys are not set up yet — ask a workspace admin.",
          no_recording: "This call has no recording to analyze.",
          below_gate: "Only connected calls over 2 minutes are scored.",
          cost_cap: "The workspace AI cost cap has been reached this month.",
          too_long: "Calls over 25 minutes can't be transcribed automatically.",
        };
        throw new Error(messages[data?.code as string] ?? data?.error ?? "Analysis failed");
      }
      await refresh(true);
    },
    [refresh],
  );

  return { calls, loading, error, refresh, analyze };
}
