import { DndContext, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { TaskCard } from "./TaskCard";
import type { TaskRecord, TaskStatus } from "../hooks/useTasks";

interface Props {
  tasks: TaskRecord[];
  onSelect: (t: TaskRecord) => void;
  onMove: (id: string, status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

function Column({
  status,
  label,
  tasks,
  onSelect,
}: {
  status: TaskStatus;
  label: string;
  tasks: TaskRecord[];
  onSelect: (t: TaskRecord) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-muted/30 p-3 space-y-3 transition-colors ${
        isOver ? "bg-muted/60" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="space-y-2 min-h-[80px]">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onClick={() => onSelect(t)} />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
        )}
      </div>
    </div>
  );
}

export function TasksBoard({ tasks, onSelect, onMove }: Props) {
  function handleDragEnd(e: DragEndEvent) {
    const overId = e.over?.id as TaskStatus | undefined;
    const taskId = e.active.id as string;
    if (!overId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === overId) return;
    onMove(taskId, overId);
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            status={col.id}
            label={col.label}
            tasks={tasks.filter((t) => t.status === col.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </DndContext>
  );
}
