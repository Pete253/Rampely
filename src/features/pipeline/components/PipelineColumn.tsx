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
    <div className="flex h-full w-72 shrink-0 flex-col rounded-[14px] border bg-white/3">
      <div className="px-3 pb-1.5 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: stage.color ?? "#8B99F0" }}
            />
            <div className="overline-label truncate text-white/50">{stage.name}</div>
          </div>
          <div className="text-xs font-semibold text-white/40">{deals.length}</div>
        </div>
        <div className="mt-0.5 text-xs font-semibold text-primary-light">
          {formatDKK(totalValue(deals))}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-primary/10",
        )}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-white/12 p-4 text-center text-xs text-white/40">
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
