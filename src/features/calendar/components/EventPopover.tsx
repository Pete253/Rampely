import { useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { EventForm } from "./EventForm";
import { formatDuration, resolveEventBadgeColor } from "../lib/calendar-utils";
import type { CalendarEvent, CreateEventInput } from "../hooks/useCalendarEvents";

interface Props {
  event: CalendarEvent;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<CreateEventInput>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function EventPopover({ event, onClose, onUpdate, onRemove }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  const start = new Date(event.start_at);
  const end = new Date(event.end_at);

  async function handleDelete() {
    try {
      await onRemove(event.id);
      toast.success("Event deleted");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{event.title}</span>
            <Badge variant="outline" className={cn(resolveEventBadgeColor(event))}>
              {event.event_type}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <div className="text-muted-foreground">When</div>
            <div className="font-medium">
              {format(start, "EEEE d. MMMM yyyy")} · {format(start, "HH:mm")} –{" "}
              {format(end, "HH:mm")}{" "}
              <span className="text-muted-foreground">({formatDuration(start, end)})</span>
            </div>
          </div>

          {event.location && (
            <div>
              <div className="text-muted-foreground">Location</div>
              <div>{event.location}</div>
            </div>
          )}

          {event.video_url && (
            <div>
              <div className="text-muted-foreground">Video</div>
              <a
                href={event.video_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline break-all"
              >
                {event.video_url}
              </a>
            </div>
          )}

          {event.description && (
            <div>
              <div className="text-muted-foreground">Description</div>
              <div className="whitespace-pre-wrap">{event.description}</div>
            </div>
          )}

          {(event.company || event.contact || event.deal) && (
            <div>
              <div className="text-muted-foreground">Linked</div>
              <div className="flex flex-wrap gap-2 pt-1">
                {event.company && (
                  <Link
                    to="/companies/$id"
                    params={{ id: event.company.id }}
                    className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/70"
                    onClick={onClose}
                  >
                    🏢 {event.company.name}
                  </Link>
                )}
                {event.contact && (
                  <Link
                    to="/contacts/$id"
                    params={{ id: event.contact.id }}
                    className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/70"
                    onClick={onClose}
                  >
                    👤 {event.contact.first_name} {event.contact.last_name ?? ""}
                  </Link>
                )}
                {event.deal && (
                  <Link
                    to="/deals/$id"
                    params={{ id: event.deal.id }}
                    className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/70"
                    onClick={onClose}
                  >
                    💼 {event.deal.title}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit event</DialogTitle>
            </DialogHeader>
            <EventForm
              initial={event}
              submitLabel="Save"
              onSubmit={async (input) => {
                await onUpdate(event.id, input);
                toast.success("Event updated");
                setEditOpen(false);
                onClose();
              }}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
