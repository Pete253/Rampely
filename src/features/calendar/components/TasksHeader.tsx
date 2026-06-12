import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskDueRange, TaskFilters, TaskPriority, TaskStatus } from "../hooks/useTasks";

export type TasksViewMode = "list" | "board";

interface Props {
  view: TasksViewMode;
  onViewChange: (v: TasksViewMode) => void;
  filters: TaskFilters;
  onFiltersChange: (next: TaskFilters) => void;
  onNewTask: () => void;
}

export function TasksHeader({ view, onViewChange, filters, onFiltersChange, onNewTask }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={view} onValueChange={(v) => onViewChange(v as TasksViewMode)}>
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="board">Board</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Search tasks…"
            className="pl-7 h-9 w-48"
          />
        </div>

        <Select
          value={filters.priorities?.[0] ?? "__all__"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              priorities: v === "__all__" ? undefined : [v as TaskPriority],
            })
          }
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.statuses?.[0] ?? "__all__"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              statuses: v === "__all__" ? undefined : [v as TaskStatus],
            })
          }
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.dueRange ?? "all"}
          onValueChange={(v) => onFiltersChange({ ...filters, dueRange: v as TaskDueRange })}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Due" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All due dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="tomorrow">Tomorrow</SelectItem>
            <SelectItem value="this_week">This week</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={onNewTask}>
        <Plus className="mr-1 h-4 w-4" /> New Task
      </Button>
    </div>
  );
}
