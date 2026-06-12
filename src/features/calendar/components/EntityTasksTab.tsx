import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskRow } from "./TaskRow";
import { TaskForm } from "./TaskForm";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { useTasks, type TaskRecord } from "../hooks/useTasks";

interface Props {
  dealId?: string;
  contactId?: string;
  companyId?: string;
}

export function EntityTasksTab({ dealId, contactId, companyId }: Props) {
  const { tasks, loading, create, update, remove, setStatus, refresh } = useTasks({
    dealId,
    contactId,
    companyId,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [active, setActive] = useState<TaskRecord | null>(null);
  const activeFresh = active ? (tasks.find((t) => t.id === active.id) ?? active) : null;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New Task
        </Button>
      </div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : tasks.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No tasks linked to this record yet.
        </p>
      ) : (
        <div className="rounded-md border bg-card">
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onClick={() => setActive(t)}
              onToggleComplete={(next) => setStatus(t.id, next)}
              showLinks={false}
            />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            initial={{ dealId, contactId, companyId }}
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
