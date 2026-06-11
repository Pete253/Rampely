import { Link } from "@tanstack/react-router";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { priorityColor, relativeDueLabel } from "../lib/calendar-utils";
import type { TaskRecord } from "../hooks/useTasks";

interface Props {
  task: TaskRecord;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const done = task.status === "done";
  const due = relativeDueLabel(task.due_at, { done });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "rounded-md border bg-background p-3 shadow-sm cursor-grab active:cursor-grabbing space-y-2",
        isDragging && "opacity-40",
      )}
    >
      <div className="text-sm font-medium">{task.title}</div>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded border",
            priorityColor(task.priority),
          )}
        >
          {task.priority}
        </span>
        {due && (
          <span
            className={cn(
              "text-xs",
              done && "text-muted-foreground line-through",
              !done && due.overdue && "text-destructive font-medium",
              !done && !due.overdue && due.soon && "text-amber-600 dark:text-amber-400",
              !done && !due.overdue && !due.soon && "text-muted-foreground",
            )}
          >
            {due.label}
          </span>
        )}
      </div>
      {(task.deal || task.contact || task.company) && (
        <div className="flex flex-wrap gap-1.5">
          {task.deal && (
            <Link
              to="/deals/$id"
              params={{ id: task.deal.id }}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70"
            >
              {task.deal.title}
            </Link>
          )}
          {task.contact && (
            <Link
              to="/contacts/$id"
              params={{ id: task.contact.id }}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70"
            >
              {task.contact.first_name} {task.contact.last_name ?? ""}
            </Link>
          )}
          {task.company && (
            <Link
              to="/companies/$id"
              params={{ id: task.company.id }}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70"
            >
              {task.company.name}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
