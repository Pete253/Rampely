import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { Deal } from "@/shared/lib/types";

export interface DealCompany {
  id: string;
  name: string;
}
export interface DealContact {
  id: string;
  first_name: string;
  last_name: string | null;
}
export interface DealOwner {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface DealWithRelations extends Deal {
  company: DealCompany | null;
  contact: DealContact | null;
  owner: DealOwner | null;
}

export interface UseDealsArgs {
  pipelineId?: string | null;
  companyId?: string;
  contactId?: string;
}

export interface CreateDealInput {
  title: string;
  value: number;
  currency?: string;
  pipeline_id: string;
  stage_id: string;
  company_id?: string | null;
  contact_id?: string | null;
  owner_id?: string | null;
  expected_close_date?: string | null;
  description?: string | null;
}

const PROFILE_CACHE = new Map<string, DealOwner>();

async function hydrateOwners(rows: DealWithRelations[]): Promise<DealWithRelations[]> {
  const missing = Array.from(
    new Set(
      rows
        .map((r) => r.owner_id)
        .filter((id): id is string => !!id && !PROFILE_CACHE.has(id)),
    ),
  );
  if (missing.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", missing);
    for (const p of data ?? []) PROFILE_CACHE.set(p.id, p);
  }
  return rows.map((r) => ({
    ...r,
    owner: r.owner_id ? (PROFILE_CACHE.get(r.owner_id) ?? null) : null,
  }));
}

export function useDeals({ pipelineId, companyId, contactId }: UseDealsArgs) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [deals, setDeals] = useState<DealWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    let q = supabase
      .from("deals")
      .select(
        "*, company:companies(id,name), contact:contacts(id,first_name,last_name)",
      )
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: true });

    if (pipelineId) q = q.eq("pipeline_id", pipelineId);
    if (companyId) q = q.eq("company_id", companyId);
    if (contactId) q = q.eq("contact_id", contactId);

    const { data, error } = await q;
    if (error) {
      console.error("Failed to load deals", error);
      setDeals([]);
    } else {
      const rows = await hydrateOwners((data ?? []) as unknown as DealWithRelations[]);
      setDeals(rows);
    }
    setLoading(false);
  }, [workspace, pipelineId, companyId, contactId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateDealInput) => {
      if (!workspace || !user) throw new Error("Not ready");
      const { data, error } = await supabase
        .from("deals")
        .insert({
          workspace_id: workspace.id,
          title: input.title,
          value: input.value,
          currency: input.currency ?? "DKK",
          pipeline_id: input.pipeline_id,
          stage_id: input.stage_id,
          company_id: input.company_id ?? null,
          contact_id: input.contact_id ?? null,
          owner_id: input.owner_id ?? user.id,
          expected_close_date: input.expected_close_date ?? null,
          description: input.description ?? null,
          sort_order: 0,
        })
        .select("*, company:companies(id,name), contact:contacts(id,first_name,last_name)")
        .single();
      if (error) throw error;
      await refresh();
      return data;
    },
    [workspace, user, refresh],
  );

  // Optimistic move across columns
  const moveStage = useCallback(
    async (
      dealId: string,
      toStageId: string,
      newSortOrder: number,
      stageNames: { from: string; to: string },
    ) => {
      if (!workspace || !user) throw new Error("Not ready");
      const prev = deals;
      // Optimistic update
      setDeals((curr) =>
        curr.map((d) =>
          d.id === dealId ? { ...d, stage_id: toStageId, sort_order: newSortOrder } : d,
        ),
      );

      const { error } = await supabase
        .from("deals")
        .update({ stage_id: toStageId, sort_order: newSortOrder })
        .eq("id", dealId)
        .eq("workspace_id", workspace.id);

      if (error) {
        setDeals(prev);
        throw error;
      }

      // Log activity (don't fail the move if activity logging fails)
      await supabase.from("activities").insert({
        workspace_id: workspace.id,
        user_id: user.id,
        type: "note",
        subject: `Moved from ${stageNames.from} to ${stageNames.to}`,
        body: null,
        deal_id: dealId,
      });
    },
    [workspace, user, deals],
  );

  // Reorder within same column — persist new sort_order for the affected list
  const reorderColumn = useCallback(
    async (stageId: string, orderedIds: string[]) => {
      if (!workspace) throw new Error("No workspace");
      const prev = deals;
      setDeals((curr) => {
        const map = new Map(curr.map((d) => [d.id, d]));
        const updated = orderedIds
          .map((id, i) => {
            const d = map.get(id);
            return d ? { ...d, sort_order: i, stage_id: stageId } : null;
          })
          .filter((d): d is DealWithRelations => !!d);
        const others = curr.filter((d) => !orderedIds.includes(d.id));
        return [...others, ...updated];
      });
      try {
        for (let i = 0; i < orderedIds.length; i++) {
          await supabase
            .from("deals")
            .update({ sort_order: i, stage_id: stageId })
            .eq("id", orderedIds[i])
            .eq("workspace_id", workspace.id);
        }
      } catch (e) {
        setDeals(prev);
        throw e;
      }
    },
    [workspace, deals],
  );

  const update = useCallback(
    async (id: string, patch: Partial<CreateDealInput>) => {
      if (!workspace) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("deals")
        .update(patch)
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .select("*, company:companies(id,name), contact:contacts(id,first_name,last_name)")
        .single();
      if (error) throw error;
      await refresh();
      return data;
    },
    [workspace, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!workspace) throw new Error("No workspace");
      const prev = deals;
      setDeals((curr) => curr.filter((d) => d.id !== id));
      const { error } = await supabase
        .from("deals")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspace.id);
      if (error) {
        setDeals(prev);
        throw error;
      }
    },
    [workspace, deals],
  );

  return { deals, loading, refresh, create, update, remove, moveStage, reorderColumn };
}
