import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRangeLabel, type CalendarViewMode } from "../lib/calendar-utils";

interface Props {
  view: CalendarViewMode;
  onViewChange: (v: CalendarViewMode) => void;
  anchor: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewEvent: () => void;
}

export function CalendarHeader({
  view,
  onViewChange,
  anchor,
  onPrev,
  onNext,
  onToday,
  onNewEvent,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Tabs value={view} onValueChange={(v) => onViewChange(v as CalendarViewMode)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm font-medium capitalize">{getRangeLabel(view, anchor)}</div>
      </div>
      <Button onClick={onNewEvent}>
        <Plus className="mr-1 h-4 w-4" />
        New Event
      </Button>
    </div>
  );
}
