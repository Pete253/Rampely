import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { Json } from "@/integrations/supabase/types";
import type { CompModel } from "@/shared/lib/types";
import type { BonusTier } from "../lib/earnings-utils";

export interface CompModelInput {
  base_salary: number;
  per_booking_rate: number;
  bonus_tiers: BonusTier[];
}

/**
 * Admin view of all comp models in the workspace (RLS restricts this to
 * owners/admins — members only receive their own + the default).
 * Saving writes a new version effective from today, keeping history intact.
 */
export function useCompModels() {
  const { workspace } = useWorkspace();
  const [models, setModels] = useState<CompModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("comp_models")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("valid_from", { ascending: false });
    if (err) {
      console.error("Failed to load comp models", err);
      setError(err.message);
      setModels([]);
    } else {
      setModels((data ?? []) as CompModel[]);
    }
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Effective model today for a user (null = workspace default), if any. */
  const effectiveFor = useCallback(
    (userId: string | null): CompModel | null => {
      const today = format(new Date(), "yyyy-MM-dd");
      // models are sorted newest-first; first match wins.
      return models.find((m) => m.user_id === userId && m.valid_from <= today) ?? null;
    },
    [models],
  );

  /** Upsert today's version for a user (or the workspace default). */
  const save = useCallback(
    async (userId: string | null, input: CompModelInput) => {
      if (!workspace) throw new Error("Not ready");
      const today = format(new Date(), "yyyy-MM-dd");
      const payload = {
        base_salary: input.base_salary,
        per_booking_rate: input.per_booking_rate,
        // BonusTier[] is plain JSON data; the cast bridges to the jsonb column type.
        bonus_tiers: input.bonus_tiers.map((t) => ({
          threshold: t.threshold,
          bonus: t.bonus,
        })) as Json,
      };

      const existing = models.find((m) => m.user_id === userId && m.valid_from === today);
      if (existing) {
        const { error: err } = await supabase
          .from("comp_models")
          .update(payload)
          .eq("id", existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("comp_models").insert({
          ...payload,
          workspace_id: workspace.id,
          user_id: userId,
          valid_from: today,
        });
        if (err) throw err;
      }
      await refresh();
    },
    [workspace, models, refresh],
  );

  return { models, loading, error, refresh, effectiveFor, save };
}
