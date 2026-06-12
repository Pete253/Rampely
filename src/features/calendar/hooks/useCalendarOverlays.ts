import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { TaskRecord } from "./useTasks";

export type CalendarOverlayKind = "task" | "deal";

export interface OverlayDealSource {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  status: "open" | "won" | "lost";
  expected_close_date: string;
}

export interface CalendarOverlayItem {
  id: string;
  kind: CalendarOverlayKind;
  date: Date;
  title: string;
  secondary: string;
  status: string;
  /** True if this is a task whose due_at is in the past and not done. */
  overdue: boolean;
  /** True if task done OR deal won/lost. */
  muted: boolean;
  /** Original source row, kept for click handlers. */
  source: TaskRecord | OverlayDealSource;
}

interface Args {
  from: Date;
  to: Date;
}

const TASK_SELECT =
  "*, contact:contacts(id, first_name, last_name), company:companies(id, name), deal:deals(id, title)";

export function useCalendarOverlays({ from, to }: Args) {
  const { workspace } = useWorkspace();
  const [taskItems, setTaskItems] = useState<CalendarOverlayItem[]>([]);
  const [dealItems, setDealItems] = useState<CalendarOverlayItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);

    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    // ISO date for the deal date column (date type)
    const fromDate = from.toISOString().slice(0, 10);
    const toDate = to.toISOString().slice(0, 10);

    const [tasksRes, dealsRes] = await Promise.all([
      supabase
        .from("tasks" as never)
        .select(TASK_SELECT)
        .eq("workspace_id", workspace.id)
        .not("due_at", "is", null)
        .gte("due_at", fromIso)
        .lt("due_at", toIso)
        .limit(200),
      supabase
        .from("deals" as never)
        .select("id, title, value, currency, status, expected_close_date")
        .eq("workspace_id", workspace.id)
        .not("expected_close_date", "is", null)
        .gte("expected_close_date", fromDate)
        .lte("expected_close_date", toDate)
        .limit(200),
    ]);

    const now = new Date();

    if (tasksRes.error) {
      console.error("overlay tasks error", tasksRes.error);
      setTaskItems([]);
    } else {
      const rows = (tasksRes.data as unknown as TaskRecord[]) ?? [];
      setTaskItems(
        rows
          .filter((t) => !!t.due_at)
          .map<CalendarOverlayItem>((t) => {
            const due = new Date(t.due_at as string);
            const overdue = t.status !== "done" && due.getTime() < now.getTime();
            return {
              id: `task:${t.id}`,
              kind: "task",
              date: due,
              title: t.title,
              secondary: `due ${formatTime(due)}`,
              status: t.status,
              overdue,
              muted: t.status === "done",
              source: t,
            };
          }),
      );
    }

    if (dealsRes.error) {
      console.error("overlay deals error", dealsRes.error);
      setDealItems([]);
    } else {
      const rows = (dealsRes.data as unknown as OverlayDealSource[]) ?? [];
      setDealItems(
        rows.map<CalendarOverlayItem>((d) => ({
          id: `deal:${d.id}`,
          kind: "deal",
          // Treat as local-noon to avoid TZ rollover on date-only column
          date: parseDateOnly(d.expected_close_date),
          title: `Close: ${d.title}`,
          secondary: d.value != null ? `${formatNumber(d.value)} ${d.currency}` : d.currency,
          status: d.status,
          overdue: false,
          muted: d.status === "won" || d.status === "lost",
          source: d,
        })),
      );
    }

    setLoading(false);
  }, [workspace, from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { taskItems, dealItems, loading, refresh };
}

function formatTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("da-DK").format(n);
}

function parseDateOnly(iso: string): Date {
  // "YYYY-MM-DD" → local noon
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}
