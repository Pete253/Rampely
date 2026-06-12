import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/shared/lib/supabase";
import { usePipelines } from "../hooks/usePipelines";
import type { PipelineStage, Deal } from "@/shared/lib/types";
import { DealForm } from "./DealForm";
import { StageChangePopover } from "./StageChangePopover";
import type { DealDetailData } from "../hooks/useDeal";

interface Props {
  deal: DealDetailData;
  onUpdate: (patch: Partial<Deal>) => Promise<void>;
  onRemove: () => Promise<void>;
  onChanged: () => void;
}

export function DealDetailHeader({ deal, onUpdate, onRemove, onChanged }: Props) {
  const navigate = useNavigate();
  const { pipelines } = usePipelines();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(deal.title);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [stagesByPipeline, setStagesByPipeline] = useState<Record<string, PipelineStage[]>>({});

  useEffect(() => {
    setTitleDraft(deal.title);
  }, [deal.title]);

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

  async function saveTitle() {
    const next = titleDraft.trim();
    if (!next || next === deal.title) {
      setEditingTitle(false);
      setTitleDraft(deal.title);
      return;
    }
    try {
      await onUpdate({ title: next });
      toast.success("Title updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setEditingTitle(false);
    }
  }

  async function handleDelete() {
    try {
      await onRemove();
      toast.success("Deal deleted");
      navigate({
        to: "/pipeline",
        search: { pipelineId: "", owner: [], minValue: undefined, maxValue: undefined },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  const ownerInitials =
    deal.owner?.full_name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-2">
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveTitle();
                if (e.key === "Escape") {
                  setTitleDraft(deal.title);
                  setEditingTitle(false);
                }
              }}
              className="h-auto py-1 text-2xl font-extrabold tracking-[-0.03em]"
            />
            <Button size="icon" variant="ghost" onClick={() => void saveTitle()}>
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setTitleDraft(deal.title);
                setEditingTitle(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="text-left text-2xl font-extrabold leading-tight tracking-[-0.03em] hover:opacity-70"
            onClick={() => setEditingTitle(true)}
            title="Click to edit"
          >
            {deal.title}
          </button>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <StageChangePopover
            pipelineId={deal.pipeline_id}
            currentStage={deal.stage}
            dealId={deal.id}
            onChanged={onChanged}
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6">
              {deal.owner?.avatar_url && <AvatarImage src={deal.owner.avatar_url} />}
              <AvatarFallback className="text-[10px]">{ownerInitials}</AvatarFallback>
            </Avatar>
            <span>{deal.owner?.full_name ?? "Unassigned"}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit deal</DialogTitle>
          </DialogHeader>
          <DealForm
            pipelines={pipelines}
            stagesByPipeline={stagesByPipeline}
            defaultPipelineId={deal.pipeline_id}
            submitLabel="Save changes"
            initialValues={{
              title: deal.title,
              value: Number(deal.value ?? 0),
              pipeline_id: deal.pipeline_id,
              stage_id: deal.stage_id,
              company_id: deal.company_id,
              contact_id: deal.contact_id,
              expected_close_date: deal.expected_close_date
                ? new Date(deal.expected_close_date)
                : null,
              description: deal.description,
            }}
            onSubmit={async (values) => {
              try {
                await onUpdate({
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
                toast.success("Deal updated");
                setEditOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to update");
              }
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deal "{deal.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The deal and its history will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
