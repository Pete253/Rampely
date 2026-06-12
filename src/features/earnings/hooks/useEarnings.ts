import { useCallback, useEffect, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { CompModel } from "@/shared/lib/types";
import {
  computeEarnings,
  pickEffectiveModel,
  type EarningsBreakdown,
  type MonthBooking,
} from "../lib/earnings-utils";

interface EarningsState {
  /** Effective comp model for the signed-in user, or null when none is configured. */
  model: CompModel | null;
  earnings: EarningsBreakdown | null;
  loading: boolean;
  error: string | null;
}

/** Real-time earnings for the signed-in user, current month. */
export function useEarnings() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [state, setState] = useState<EarningsState>({
    model: null,
    earnings: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!workspace || !user) return;
    setState((s) => ({ ...s, loading: true, error: null }));

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");

    // RLS already limits rows to own + workspace default; the filter keeps
    // admins (who can read everything) scoped to what applies to them.
    const [modelsRes, bookingsRes] = await Promise.all([
      supabase
        .from("comp_models")
        .select("*")
        .eq("workspace_id", workspace.id)
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .lte("valid_from", today),
      supabase
        .from("bookings")
        .select("held_at, outcome")
        .eq("workspace_id", workspace.id)
        .eq("booked_by", user.id)
        .gte("held_at", startOfMonth(now).toISOString())
        .lte("held_at", endOfMonth(now).toISOString()),
    ]);

    if (modelsRes.error || bookingsRes.error) {
      const message = modelsRes.error?.message ?? bookingsRes.error?.message ?? "Failed to load";
      console.error("Failed to load earnings", modelsRes.error ?? bookingsRes.error);
      setState({ model: null, earnings: null, loading: false, error: message });
      return;
    }

    const model = pickEffectiveModel((modelsRes.data ?? []) as CompModel[], user.id);
    setState({
      model,
      earnings: model
        ? computeEarnings(model, (bookingsRes.data ?? []) as MonthBooking[], now)
        : null,
      loading: false,
      error: null,
    });
  }, [workspace, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
