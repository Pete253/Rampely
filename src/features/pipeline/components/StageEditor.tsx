import { useEffect, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { usePipelineStages } from "../hooks/usePipelines";
import { STAGE_COLOR_PRESETS } from "../lib/pipeline-utils";
import type { PipelineStage } from "@/shared/lib/types";

interface Props {
  pipelineId: string;
}

export function StageEditor({ pipelineId }: Props) {
  const { stages, loading, createStage, updateStage, deleteStage, reorderStages } =
    usePipelineStages(pipelineId);
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  useEffect(() => {
    setLocalOrder(stages.map((s) => s.id));
  }, [stages]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localOrder.indexOf(String(active.id));
    const newIdx = localOrder.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = [...localOrder];
    next.splice(oldIdx, 1);
    next.splice(newIdx, 0, String(active.id));
    setLocalOrder(next);
    try {
      await reorderStages(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reorder");
    }
  }

  async function handleAddStage() {
    try {
      await createStage({
        name: "New stage",
        color: STAGE_COLOR_PRESETS[0],
        probability: 10,
        stage_type: "open",
      });
      toast.success("Stage created");
    } catch (e) {
      toast.error(`Failed to create stage: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function validate() {
    const wonCount = stages.filter((s) => s.stage_type === "won").length;
    const lostCount = stages.filter((s) => s.stage_type === "lost").length;
    if (wonCount !== 1)
      toast.warning(`Pipeline should have exactly one Won stage (currently ${wonCount}).`);
    if (lostCount !== 1)
      toast.warning(`Pipeline should have exactly one Lost stage (currently ${lostCount}).`);
  }

  const orderedStages = localOrder
    .map((id) => stages.find((s) => s.id === id))
    .filter((s): s is PipelineStage => !!s);

  if (loading) return <div className="text-sm text-muted-foreground">Loading stages…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Drag rows to reorder. Each pipeline should have exactly one Won and one Lost stage.
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={validate}>
            Validate
          </Button>
          <Button size="sm" onClick={handleAddStage}>
            <Plus className="mr-1 h-4 w-4" /> Add Stage
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedStages.map((s) => (
              <StageRow
                key={s.id}
                stage={s}
                onUpdate={(patch) => updateStage(s.id, patch)}
                onDelete={() => deleteStage(s.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function StageRow({
  stage,
  onUpdate,
  onDelete,
}: {
  stage: PipelineStage;
  onUpdate: (patch: Partial<PipelineStage>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [name, setName] = useState(stage.name);
  const [prob, setProb] = useState(stage.probability ?? 0);

  useEffect(() => {
    setName(stage.name);
    setProb(stage.probability ?? 0);
  }, [stage.name, stage.probability]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card p-2",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== stage.name) void onUpdate({ name: name.trim() });
        }}
        className="h-8 max-w-[200px]"
      />

      <div className="flex items-center gap-1">
        {STAGE_COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onUpdate({ color: c })}
            className={cn(
              "h-5 w-5 rounded-full border transition",
              stage.color === c ? "ring-2 ring-offset-1 ring-foreground" : "opacity-70",
            )}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={100}
            value={prob}
            onChange={(e) => setProb(Number(e.target.value))}
            onBlur={() => {
              if (prob !== stage.probability) void onUpdate({ probability: prob });
            }}
            className="h-8 w-16"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>

        <Select
          value={stage.stage_type}
          onValueChange={(v) => onUpdate({ stage_type: v as "open" | "won" | "lost" })}
        >
          <SelectTrigger className="h-8 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete stage "{stage.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                You can only delete a stage when no deals are assigned to it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await onDelete();
                    toast.success("Stage deleted");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to delete");
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
