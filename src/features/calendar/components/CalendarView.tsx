import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarWeekView } from "./CalendarWeekView";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarAgendaSidebar } from "./CalendarAgendaSidebar";
import { EventForm } from "./EventForm";
import { EventPopover } from "./EventPopover";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { getRangeBounds, shiftAnchor, type CalendarViewMode } from "../lib/calendar-utils";
import {
  useCalendarEvents,
  type CalendarEvent,
  type CreateEventInput,
} from "../hooks/useCalendarEvents";
import { useCalendarOverlays, type CalendarOverlayItem } from "../hooks/useCalendarOverlays";
import { useTasks, type TaskRecord } from "../hooks/useTasks";
import { usePendingCreate } from "@/shared/contexts/PendingCreateContext";

interface Props {
  initialView?: CalendarViewMode;
  initialDate?: string;
}

export function CalendarView({ initialView, initialDate }: Props = {}) {
  const [view, setView] = useState<CalendarViewMode>(initialView ?? "week");
  const [anchor, setAnchor] = useState<Date>(() => {
    if (initialDate) {
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  const range = useMemo(() => getRangeBounds(view, anchor), [view, anchor]);
  const { events, loading, create, update, remove } = useCalendarEvents(range);
  const { taskItems, dealItems, refresh: refreshOverlays } = useCalendarOverlays(range);
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [createInitial, setCreateInitial] = useState<Partial<CalendarEvent> | undefined>(undefined);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null);
  const { pendingCreate, setPendingCreate } = usePendingCreate();

  // Task mutations for the detail drawer (workspace-scoped)
  const { update: updateTask, remove: removeTask, setStatus: setTaskStatus } = useTasks({});

  useEffect(() => {
    if (pendingCreate === "event") {
      setCreateInitial(undefined);
      setCreateOpen(true);
      setPendingCreate(null);
    }
  }, [pendingCreate, setPendingCreate]);

  const openCreate = (start?: Date) => {
    if (start) {
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setCreateInitial({
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        event_type: "meeting",
      });
    } else {
      setCreateInitial(undefined);
    }
    setCreateOpen(true);
  };

  const handleOverlayClick = (item: CalendarOverlayItem) => {
    if (item.kind === "task") {
      setActiveTask(item.source as TaskRecord);
    } else {
      const dealId = (item.source as { id: string }).id;
      void navigate({ to: "/deals/$id", params: { id: dealId } });
    }
  };

  return (
    <div className="space-y-4">
      <CalendarHeader
        view={view}
        onViewChange={setView}
        anchor={anchor}
        onPrev={() => setAnchor((a) => shiftAnchor(view, a, -1))}
        onNext={() => setAnchor((a) => shiftAnchor(view, a, 1))}
        onToday={() => setAnchor(new Date())}
        onNewEvent={() => openCreate()}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-[500px] w-full" />
          ) : view === "month" ? (
            <CalendarMonthView
              anchor={anchor}
              events={events}
              taskItems={taskItems}
              dealItems={dealItems}
              onOverlayClick={handleOverlayClick}
              onSelectDay={(d) => {
                setAnchor(d);
                setView("day");
              }}
              onEventClick={setActiveEvent}
            />
          ) : view === "week" ? (
            <CalendarWeekView
              anchor={anchor}
              events={events}
              taskItems={taskItems}
              dealItems={dealItems}
              onOverlayClick={handleOverlayClick}
              onSlotClick={openCreate}
              onEventClick={setActiveEvent}
              onReschedule={(id, s, e) =>
                update(id, { start_at: s.toISOString(), end_at: e.toISOString() })
              }
            />
          ) : (
            <CalendarDayView
              anchor={anchor}
              events={events}
              taskItems={taskItems}
              dealItems={dealItems}
              onOverlayClick={handleOverlayClick}
              onSlotClick={openCreate}
              onEventClick={setActiveEvent}
              onReschedule={(id, s, e) =>
                update(id, { start_at: s.toISOString(), end_at: e.toISOString() })
              }
            />
          )}
          {!loading && events.length === 0 && taskItems.length === 0 && dealItems.length === 0 && (
            <div className="mt-2">
              <EmptyState
                icon={CalendarIcon}
                title="No events"
                description={`Nothing scheduled this ${view}.`}
                action={{ label: "New event", onClick: () => openCreate() }}
              />
            </div>
          )}
        </div>
        <CalendarAgendaSidebar
          events={events}
          taskItems={taskItems}
          dealItems={dealItems}
          onEventClick={setActiveEvent}
          onOverlayClick={handleOverlayClick}
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          <EventForm
            initial={createInitial}
            onSubmit={async (input: CreateEventInput) => {
              await create(input);
              toast.success("Event created");
              setCreateOpen(false);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {activeEvent && (
        <EventPopover
          event={activeEvent}
          onClose={() => setActiveEvent(null)}
          onUpdate={update}
          onRemove={remove}
        />
      )}

      <TaskDetailDrawer
        task={activeTask}
        open={!!activeTask}
        onOpenChange={(o) => {
          if (!o) {
            setActiveTask(null);
            void refreshOverlays();
          }
        }}
        onUpdate={async (id, patch) => {
          await updateTask(id, patch);
          await refreshOverlays();
        }}
        onRemove={async (id) => {
          await removeTask(id);
          setActiveTask(null);
          await refreshOverlays();
        }}
        onSetStatus={async (id, status) => {
          await setTaskStatus(id, status);
          await refreshOverlays();
        }}
      />
    </div>
  );
}
