import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskRow } from "./TaskRow";
import type { TaskRecord, TaskStatus } from "../hooks/useTasks";

interface Props {
  tasks: TaskRecord[];
  onSelect: (task: TaskRecord) => void;
  onToggleStatus: (id: string, next: TaskStatus) => void;
  onReorder?: (orderedIds: string[]) => void;
  reorderEnabled?: boolean;
}

export function TasksList({
  tasks,
  onSelect,
  onToggleStatus,
  onReorder,
  reorderEnabled = false,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  if (tasks.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
        No tasks found.
      </p>
    );
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(tasks, oldIndex, newIndex).map((t) => t.id);
    onReorder?.(next);
  };

  const ids = tasks.map((t) => t.id);

  return (
    <>
      {!reorderEnabled && (
        <p className="text-xs text-muted-foreground px-1">
          Clear filters to reorder
        </p>
      )}
      <div className="rounded-md border bg-card">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onClick={() => onSelect(t)}
                onToggleComplete={(next) => onToggleStatus(t.id, next)}
                draggable={reorderEnabled}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}
