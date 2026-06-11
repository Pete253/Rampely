import { useState } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { CompanySelector } from "@/features/contacts/components/CompanySelector";
import { ContactSelector } from "@/features/pipeline/components/ContactSelector";
import { DealSelector } from "./DealSelector";
import { ActivityTimeline } from "@/shared/components/activity/ActivityTimeline";

import type {
  CreateTaskInput,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from "../hooks/useTasks";

interface Props {
  task: TaskRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, patch: Partial<CreateTaskInput>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onSetStatus: (id: string, status: TaskStatus) => Promise<void>;
}

export function TaskDetailDrawer({
  task,
  open,
  onOpenChange,
  onUpdate,
  onRemove,
  onSetStatus,
}: Props) {
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [descEditing, setDescEditing] = useState(false);

  if (!task) return null;

  const due = task.due_at ? format(new Date(task.due_at), "yyyy-MM-dd'T'HH:mm") : "";

  async function handleDelete() {
    if (!task) return;
    try {
      await onRemove(task.id);
      toast.success("Task deleted");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {titleEditing ? (
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={async () => {
                  if (titleDraft.trim() && titleDraft.trim() !== task.title) {
                    await onUpdate(task.id, { title: titleDraft.trim() });
                  }
                  setTitleEditing(false);
                }}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className="text-left hover:underline flex-1"
                onClick={() => {
                  setTitleDraft(task.title);
                  setTitleEditing(true);
                }}
              >
                {task.title}
              </button>
            )}
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border",
                task.status === "done"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                  : task.status === "in_progress"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                    : "bg-muted text-muted-foreground border-border",
              )}
            >
              {task.status.replace("_", " ")}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Description</Label>
            {descEditing ? (
              <Textarea
                rows={4}
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={async () => {
                  if (descDraft !== (task.description ?? "")) {
                    await onUpdate(task.id, { description: descDraft || null });
                  }
                  setDescEditing(false);
                }}
                autoFocus
              />
            ) : (
              <button
                type="button"
                className="block w-full text-left text-sm rounded-md border border-dashed p-2 hover:bg-muted/40"
                onClick={() => {
                  setDescDraft(task.description ?? "");
                  setDescEditing(true);
                }}
              >
                {task.description || (
                  <span className="text-muted-foreground">No description. Click to add.</span>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={task.priority}
                onValueChange={(v) => onUpdate(task.id, { priority: v as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due</Label>
              <Input
                type="datetime-local"
                value={due}
                onChange={(e) =>
                  onUpdate(task.id, {
                    due_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
              />
              {task.due_at && (
                <Link
                  to="/calendar"
                  search={{
                    view: "day",
                    date: new Date(task.due_at).toISOString().slice(0, 10),
                  }}
                  className="text-[11px] text-primary hover:underline"
                >
                  View on calendar →
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <CompanySelector
                value={task.company_id}
                onChange={(v) => onUpdate(task.id, { company_id: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <ContactSelector
                value={task.contact_id}
                onChange={(v) => onUpdate(task.id, { contact_id: v })}
                companyId={task.company_id}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deal</Label>
              <DealSelector
                value={task.deal_id}
                onChange={(v) => onUpdate(task.id, { deal_id: v })}
                companyId={task.company_id}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onSetStatus(task.id, task.status === "done" ? "todo" : "done")
              }
            >
              {task.status === "done" ? "Mark incomplete" : "Mark complete"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="pt-2 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Activity</h4>
            {task.deal_id ? (
              <ActivityTimeline dealId={task.deal_id} />
            ) : task.contact_id ? (
              <ActivityTimeline contactId={task.contact_id} />
            ) : task.company_id ? (
              <ActivityTimeline companyId={task.company_id} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Link this task to a deal, contact, or company to see related activity.
              </p>
            )}
          </div>
        </div>
        {/* Suppress unused-import warning for Link if not used in this file */}
        <Link to="/tasks" className="hidden" />
      </SheetContent>
    </Sheet>
  );
}
