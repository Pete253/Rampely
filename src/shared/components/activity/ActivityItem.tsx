import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { ActivityTypeIcon } from "./ActivityTypeIcon";
import { ACTIVITY_TYPE_META } from "@/shared/lib/activity-types";
import type { Activity } from "@/shared/hooks/useActivities";

interface Props {
  activity: Activity;
  onUpdate: (
    id: string,
    patch: { subject?: string | null; body?: string | null },
  ) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ActivityItem({ activity, onUpdate, onDelete }: Props) {
  const { user } = useAuth();
  const { role } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(activity.subject ?? "");
  const [body, setBody] = useState(activity.body ?? "");
  const [saving, setSaving] = useState(false);

  const canEdit = !!user && (user.id === activity.user_id || role === "owner");
  const meta = ACTIVITY_TYPE_META[activity.type];
  const author = activity.author;
  const authorName = author?.full_name ?? "Unknown";

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(activity.id, {
        subject: subject.trim() || null,
        body: body.trim() || null,
      });
      toast.success("Activity updated");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await onDelete(activity.id);
      toast.success("Activity deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="group relative flex gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30">
      <ActivityTypeIcon type={activity.type} />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-5 w-5">
            {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
            <AvatarFallback className="text-[10px]">{initials(authorName)}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{authorName}</span>
          <span>·</span>
          <span>{meta.label}</span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
        </div>

        {editing ? (
          <div className="space-y-2">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="mr-1 h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="mr-1 h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            {activity.subject && (
              <div className="font-semibold leading-tight">{activity.subject}</div>
            )}
            {activity.body && (
              <div className="whitespace-pre-wrap text-sm text-foreground/90">{activity.body}</div>
            )}
          </>
        )}
      </div>

      {canEdit && !editing && (
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
