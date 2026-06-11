import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useMatches, useNavigate, useSearch } from "@tanstack/react-router";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { KanbanSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import { usePendingCreate } from "@/shared/contexts/PendingCreateContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { usePipelines, usePipelineStages } from "../hooks/usePipelines";
import { useDeals, type DealWithRelations } from "../hooks/useDeals";
import { PipelineHeader } from "./PipelineHeader";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineFilters } from "./PipelineFilters";
import { DealForm } from "./DealForm";
import type { PipelineStage } from "@/shared/lib/types";

export function PipelineBoard() {
  const matches = useMatches();
  const hasChildRoute = matches.some((m) => m.routeId !== "/_authenticated/pipeline" && m.routeId.startsWith("/_authenticated/pipeline/"));
  if (hasChildRoute) {
    return <Outlet />;
  }
  return <PipelineBoardInner />;
}

function PipelineBoardInner() {
  const navigate = useNavigate({ from: "/pipeline" });
  const search = useSearch({ from: "/_authenticated/pipeline" });
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { pipelines, loading: pipelinesLoading } = usePipelines();

  const defaultPipeline = pipelines.find((p) => p.is_default) ?? pipelines[0];
  const selectedPipelineId = search.pipelineId || defaultPipeline?.id || "";

  const { stages, loading: stagesLoading } = usePipelineStages(selectedPipelineId || undefined);
  const { deals, loading: dealsLoading, create, update, remove, moveStage, reorderColumn } = useDeals({
    pipelineId: selectedPipelineId || undefined,
  });

  const [editingDeal, setEditingDeal] = useState<DealWithRelations | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { pendingCreate, setPendingCreate } = usePendingCreate();

  useEffect(() => {
    if (pendingCreate === "deal") {
      setCreateOpen(true);
      setPendingCreate(null);
    }
  }, [pendingCreate, setPendingCreate]);

  // Stages for all pipelines (for the Add Deal form)
  const [stagesByPipeline, setStagesByPipeline] = useState<Record<string, PipelineStage[]>>({});
  useEffect(() => {
    if (pipelines.length === 0) return;
    void (async () => {
      const { data } = await supabase
        .from("pipeline_stages")
        .select("*")
        .in(
          "pipeline_id",
          pipelines.map((p) => p.id),
        )
        .order("sort_order", { ascending: true });
      const map: Record<string, PipelineStage[]> = {};
      for (const s of data ?? []) {
        if (!map[s.pipeline_id]) map[s.pipeline_id] = [];
        map[s.pipeline_id].push(s);
      }
      setStagesByPipeline(map);
    })();
  }, [pipelines]);

  // Last stage-move per deal (from activities)
  const [lastMoveByDeal, setLastMoveByDeal] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!workspace || deals.length === 0) {
      setLastMoveByDeal(new Map());
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("activities")
        .select("deal_id, created_at, subject")
        .eq("workspace_id", workspace.id)
        .in(
          "deal_id",
          deals.map((d) => d.id),
        )
        .like("subject", "Moved from %")
        .order("created_at", { ascending: false });
      const map = new Map<string, string>();
      for (const row of data ?? []) {
        if (row.deal_id && !map.has(row.deal_id)) {
          map.set(row.deal_id, row.created_at);
        }
      }
      setLastMoveByDeal(map);
    })();
  }, [workspace, deals]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Apply client-side filters
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (search.owner.length > 0 && (!d.owner_id || !search.owner.includes(d.owner_id)))
        return false;
      const v = Number(d.value ?? 0);
      if (search.minValue !== undefined && v < search.minValue) return false;
      if (search.maxValue !== undefined && v > search.maxValue) return false;
      return true;
    });
  }, [deals, search.owner, search.minValue, search.maxValue]);

  const dealsByStage = useMemo(() => {
    const map = new Map<string, typeof filteredDeals>();
    for (const s of stages) map.set(s.id, []);
    for (const d of filteredDeals) {
      const arr = map.get(d.stage_id);
      if (arr) arr.push(d);
    }
    // Each list already comes ordered by sort_order from the query
    return map;
  }, [stages, filteredDeals]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeDeal = deals.find((d) => d.id === activeId);
    if (!activeDeal) return;

    // Determine destination column
    const overData = over.data.current as { type?: string; stageId?: string } | undefined;
    const destStageId =
      overData?.type === "column"
        ? overData.stageId!
        : (deals.find((d) => d.id === overId)?.stage_id ?? activeDeal.stage_id);

    const sourceStageId = activeDeal.stage_id;

    if (sourceStageId === destStageId) {
      // Reorder within column
      const colDeals = (dealsByStage.get(destStageId) ?? []).map((d) => d.id);
      const fromIdx = colDeals.indexOf(activeId);
      let toIdx = colDeals.indexOf(overId);
      if (toIdx === -1) toIdx = colDeals.length - 1;
      if (fromIdx === -1 || fromIdx === toIdx) return;
      const reordered = [...colDeals];
      reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, activeId);
      try {
        await reorderColumn(destStageId, reordered);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to reorder");
      }
    } else {
      // Move to a different column
      const fromStage = stages.find((s) => s.id === sourceStageId);
      const toStage = stages.find((s) => s.id === destStageId);
      if (!toStage) return;
      const destDeals = dealsByStage.get(destStageId) ?? [];
      let insertIdx = destDeals.length;
      if (overData?.type !== "column") {
        const overIdx = destDeals.findIndex((d) => d.id === overId);
        if (overIdx >= 0) insertIdx = overIdx;
      }
      try {
        await moveStage(activeId, destStageId, insertIdx, {
          from: fromStage?.name ?? "Unknown",
          to: toStage.name,
        });
        toast.success(`Moved to ${toStage.name}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to move deal");
      }
    }
  }

  async function handleDeleteDeal(deal: DealWithRelations) {
    const snapshot = {
      title: deal.title,
      contact_id: deal.contact_id,
      company_id: deal.company_id,
    };
    try {
      await remove(deal.id);
      if (workspace && user && (snapshot.contact_id || snapshot.company_id)) {
        try {
          await supabase.from("activities").insert({
            workspace_id: workspace.id,
            user_id: user.id,
            type: "note",
            subject: `Deal '${snapshot.title}' deleted`,
            contact_id: snapshot.contact_id,
            company_id: snapshot.company_id,
            deal_id: null,
          });
        } catch (err) {
          console.error("Failed to log deletion activity", err);
        }
      }
      toast.success("Deal deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete deal");
    }
  }

  async function handleEditSubmit(values: Parameters<typeof create>[0]) {
    if (!editingDeal) return;
    try {
      await update(editingDeal.id, values);
      toast.success("Deal updated");
      setEditingDeal(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update deal");
    }
  }

  if (pipelinesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-72" />
          ))}
        </div>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <EmptyState
        icon={KanbanSquare}
        title="No pipelines yet"
        description="Create your first pipeline to start tracking deals."
        action={null}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PipelineHeader
        pipelines={pipelines}
        selectedPipelineId={selectedPipelineId}
        onSelectPipeline={(id) =>
          navigate({ search: (prev: any) => ({ ...prev, pipelineId: id }) })
        }
        stages={stages}
        stagesByPipeline={stagesByPipeline}
        deals={deals}
        onCreateDeal={create}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />

      <PipelineFilters
        value={{ owner: search.owner, minValue: search.minValue, maxValue: search.maxValue }}
        onChange={(next) =>
          navigate({
            search: (prev: any) => ({
              ...prev,
              owner: next.owner,
              minValue: next.minValue,
              maxValue: next.maxValue,
            }),
          })
        }
      />

      {stagesLoading || dealsLoading ? (
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-72" />
          ))}
        </div>
      ) : stages.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            This pipeline has no stages yet.{" "}
            <Link to="/pipeline/settings" search={{ pipelineId: "", owner: [], minValue: undefined, maxValue: undefined }} className="text-primary underline">
              Configure stages
            </Link>
            .
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex h-[calc(100vh-260px)] gap-3 overflow-x-auto pb-2">
            {stages.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage.get(stage.id) ?? []}
                lastMoveByDeal={lastMoveByDeal}
                onEditDeal={setEditingDeal}
                onDeleteDeal={handleDeleteDeal}
              />
            ))}
          </div>
        </DndContext>
      )}

      <Dialog open={!!editingDeal} onOpenChange={(o) => !o && setEditingDeal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit deal</DialogTitle>
          </DialogHeader>
          {editingDeal && (
            <DealForm
              pipelines={pipelines}
              stagesByPipeline={stagesByPipeline}
              defaultPipelineId={editingDeal.pipeline_id}
              submitLabel="Save changes"
              initialValues={{
                title: editingDeal.title,
                value: Number(editingDeal.value ?? 0),
                pipeline_id: editingDeal.pipeline_id,
                stage_id: editingDeal.stage_id,
                company_id: editingDeal.company_id,
                contact_id: editingDeal.contact_id,
                expected_close_date: editingDeal.expected_close_date
                  ? new Date(editingDeal.expected_close_date)
                  : null,
                description: editingDeal.description,
              }}
              onSubmit={async (values) => {
                await handleEditSubmit({
                  title: values.title,
                  value: values.value,
                  pipeline_id: values.pipeline_id,
                  stage_id: values.stage_id,
                  company_id: values.company_id ?? null,
                  contact_id: values.contact_id ?? null,
                  description: values.description ?? null,
                  expected_close_date: values.expected_close_date
                    ? values.expected_close_date.toISOString().slice(0, 10)
                    : null,
                });
              }}
              onCancel={() => setEditingDeal(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
