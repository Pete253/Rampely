import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/shared/components/EmptyState";
import { TasksHeader, type TasksViewMode } from "./TasksHeader";
import { TasksList } from "./TasksList";
import { TasksBoard } from "./TasksBoard";
import { TaskForm } from "./TaskForm";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { useTasks, type TaskFilters, type TaskRecord } from "../hooks/useTasks";
import { usePendingCreate } from "@/shared/contexts/PendingCreateContext";

export function TasksView() {
  const [view, setView] = useState<TasksViewMode>("list");
  const [filters, setFilters] = useState<TaskFilters>({});
  const { tasks, loading, create, update, remove, setStatus, refresh, reorder } = useTasks(filters);
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<TaskRecord | null>(null);
  const { pendingCreate, setPendingCreate } = usePendingCreate();

  useEffect(() => {
    if (pendingCreate === "task") {
      setCreateOpen(true);
      setPendingCreate(null);
    }
  }, [pendingCreate, setPendingCreate]);

  // Always-on count for empty-state CTA
  const { tasks: allTasks } = useTasks({});

  // Keep selected task in sync after refresh
  const activeFresh = active ? (tasks.find((t) => t.id === active.id) ?? active) : null;

  return (
    <div className="space-y-4">
      <TasksHeader
        view={view}
        onViewChange={setView}
        filters={filters}
        onFiltersChange={setFilters}
        onNewTask={() => setCreateOpen(true)}
      />

      {loading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : tasks.length === 0 && allTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Get started by creating your first task."
          action={{ label: "Create your first task", onClick: () => setCreateOpen(true) }}
        />
      ) : view === "list" ? (
        <TasksList
          tasks={tasks}
          onSelect={setActive}
          onToggleStatus={setStatus}
          onReorder={reorder}
          reorderEnabled={
            !filters.search &&
            !filters.assignees?.length &&
            !filters.priorities?.length &&
            !filters.statuses?.length &&
            (!filters.dueRange || filters.dueRange === "all")
          }
        />
      ) : (
        <TasksBoard tasks={tasks} onSelect={setActive} onMove={setStatus} />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            onSubmit={async (input) => {
              await create(input);
              toast.success("Task created");
              setCreateOpen(false);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <TaskDetailDrawer
        task={activeFresh}
        open={!!active}
        onOpenChange={(o) => {
          if (!o) setActive(null);
          else void refresh();
        }}
        onUpdate={update}
        onRemove={async (id) => {
          await remove(id);
          setActive(null);
        }}
        onSetStatus={setStatus}
      />
    </div>
  );
}
