import { Link } from "@tanstack/react-router";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { priorityColor, relativeDueLabel } from "../lib/calendar-utils";
import type { TaskRecord, TaskStatus } from "../hooks/useTasks";

interface Props {
  task: TaskRecord;
  onToggleComplete: (next: TaskStatus) => void;
  onClick: () => void;
  showLinks?: boolean;
  draggable?: boolean;
}

export function TaskRow({
  task,
  onToggleComplete,
  onClick,
  showLinks = true,
  draggable = false,
}: Props) {
  const done = task.status === "done";
  const due = relativeDueLabel(task.due_at, { done });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: !draggable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    boxShadow: isDragging ? "0 8px 24px -8px rgba(0,0,0,0.25)" : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="flex items-center gap-2 px-3 py-2.5 border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer bg-card"
    >
      {draggable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground -ml-1"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <Checkbox
        checked={done}
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={(v) => onToggleComplete(v ? "done" : "todo")}
      />
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm font-medium truncate",
            done && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </div>
        {showLinks && (task.contact || task.company || task.deal) && (
          <div className="flex flex-wrap gap-1.5 mt-1">
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
            "text-xs whitespace-nowrap",
            due.overdue && "text-destructive font-medium",
            !due.overdue && due.soon && "text-amber-600 dark:text-amber-400",
            !due.overdue && !due.soon && "text-muted-foreground",
          )}
        >
          {due.label}
        </span>
      )}
    </div>
  );
}
