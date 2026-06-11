import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { Pipeline, PipelineStage } from "@/shared/lib/types";
import { DEFAULT_STAGES } from "../lib/pipeline-utils";

export function usePipelines() {
  const { workspace } = useWorkspace();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("pipelines")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to load pipelines", error);
      setPipelines([]);
    } else {
      setPipelines(data ?? []);
    }
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createPipeline = useCallback(
    async (name: string, seedDefaults: boolean) => {
      if (!workspace) throw new Error("No workspace");
      const isFirst = pipelines.length === 0;
      const { data: pipeline, error } = await supabase
        .from("pipelines")
        .insert({ workspace_id: workspace.id, name, is_default: isFirst })
        .select("*")
        .single();
      if (error) throw error;
      if (seedDefaults && pipeline) {
        const rows = DEFAULT_STAGES.map((s, i) => ({
          pipeline_id: pipeline.id,
          name: s.name,
          color: s.color,
          probability: s.probability,
          stage_type: s.stage_type,
          sort_order: i,
        }));
        const { error: stageErr } = await supabase.from("pipeline_stages").insert(rows);
        if (stageErr) throw stageErr;
      }
      await refresh();
      return pipeline;
    },
    [workspace, pipelines.length, refresh],
  );

  const updatePipeline = useCallback(
    async (id: string, patch: Partial<Pick<Pipeline, "name" | "is_default">>) => {
      if (!workspace) throw new Error("No workspace");
      // If setting default, unset others first
      if (patch.is_default) {
        await supabase
          .from("pipelines")
          .update({ is_default: false })
          .eq("workspace_id", workspace.id)
          .neq("id", id);
      }
      const { error } = await supabase
        .from("pipelines")
        .update(patch)
        .eq("id", id)
        .eq("workspace_id", workspace.id);
      if (error) throw error;
      await refresh();
    },
    [workspace, refresh],
  );

  const deletePipeline = useCallback(
    async (id: string) => {
      if (!workspace) throw new Error("No workspace");
      // Block default + with deals
      const target = pipelines.find((p) => p.id === id);
      if (target?.is_default) throw new Error("Cannot delete the default pipeline");
      const { count, error: countErr } = await supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("pipeline_id", id)
        .eq("workspace_id", workspace.id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error("Reassign or remove deals before deleting this pipeline");
      }
      // Delete stages first (no FK cascade configured)
      await supabase.from("pipeline_stages").delete().eq("pipeline_id", id);
      const { error } = await supabase
        .from("pipelines")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspace.id);
      if (error) throw error;
      await refresh();
    },
    [workspace, pipelines, refresh],
  );

  return { pipelines, loading, refresh, createPipeline, updatePipeline, deletePipeline };
}

export function usePipelineStages(pipelineId: string | undefined) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!pipelineId) {
      setStages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("Failed to load stages", error);
      setStages([]);
    } else {
      setStages(data ?? []);
    }
    setLoading(false);
  }, [pipelineId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createStage = useCallback(
    async (input: {
      name: string;
      color: string;
      probability: number;
      stage_type: "open" | "won" | "lost";
    }) => {
      if (!pipelineId) throw new Error("No pipeline");
      const sort_order = stages.length;
      const { error } = await supabase.from("pipeline_stages").insert({
        pipeline_id: pipelineId,
        name: input.name,
        color: input.color,
        probability: input.probability,
        stage_type: input.stage_type,
        sort_order,
      });
      if (error) throw error;
      await refresh();
    },
    [pipelineId, stages.length, refresh],
  );

  const updateStage = useCallback(
    async (id: string, patch: Partial<PipelineStage>) => {
      const { error } = await supabase
        .from("pipeline_stages")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const deleteStage = useCallback(
    async (id: string) => {
      // Block if deals exist
      const { count, error: countErr } = await supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        throw new Error("Reassign deals on this stage before deleting it");
      }
      const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const reorderStages = useCallback(
    async (orderedIds: string[]) => {
      // Optimistic local
      setStages((prev) => {
        const map = new Map(prev.map((s) => [s.id, s]));
        return orderedIds
          .map((id, i) => {
            const s = map.get(id);
            return s ? { ...s, sort_order: i } : null;
          })
          .filter((s): s is PipelineStage => !!s);
      });
      // Persist sequentially (small N)
      for (let i = 0; i < orderedIds.length; i++) {
        await supabase.from("pipeline_stages").update({ sort_order: i }).eq("id", orderedIds[i]);
      }
    },
    [],
  );

  return { stages, loading, refresh, createStage, updateStage, deleteStage, reorderStages };
}
