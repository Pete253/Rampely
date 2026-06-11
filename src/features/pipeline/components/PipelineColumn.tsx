import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/shared/lib/types";
import { DealCard } from "./DealCard";
import { formatDKK, totalValue } from "../lib/pipeline-utils";
import type { DealWithRelations } from "../hooks/useDeals";

interface Props {
  stage: PipelineStage;
  deals: DealWithRelations[];
  lastMoveByDeal: Map<string, string>;
  onEditDeal?: (deal: DealWithRelations) => void;
  onDeleteDeal?: (deal: DealWithRelations) => void;
}

export function PipelineColumn({ stage, deals, lastMoveByDeal, onEditDeal, onDeleteDeal }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "column", stageId: stage.id },
  });

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg border bg-muted/30">
      <div
        className="rounded-t-lg border-t-4 px-3 py-2"
        style={{ borderTopColor: stage.color ?? "#94a3b8" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-sm">{stage.name}</div>
          <div className="text-xs text-muted-foreground">{deals.length}</div>
        </div>
        <div className="text-xs text-muted-foreground">{formatDKK(totalValue(deals))}</div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-accent/40",
        )}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No deals in this stage
            </div>
          ) : (
            deals.map((d) => (
              <DealCard
                key={d.id}
                deal={d}
                lastMoveAt={lastMoveByDeal.get(d.id) ?? null}
                onEdit={onEditDeal}
                onDelete={onDeleteDeal}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
