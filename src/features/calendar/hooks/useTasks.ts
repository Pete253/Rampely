import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, endOfDay, endOfWeek, startOfDay, startOfWeek } from "date-fns";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface TaskRecord {
  id: string;
  workspace_id: string;
  sort_order: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  assignee_id: string;
  creator_id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  contact?: { id: string; first_name: string; last_name: string | null } | null;
  company?: { id: string; name: string } | null;
  deal?: { id: string; title: string } | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_at?: string | null;
  assignee_id?: string; // defaults to creator
  contact_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
}

export type TaskDueRange = "all" | "today" | "tomorrow" | "this_week" | "overdue";

export interface TaskFilters {
  assignees?: string[];
  priorities?: TaskPriority[];
  statuses?: TaskStatus[];
  dueRange?: TaskDueRange;
  search?: string;
  dealId?: string;
  contactId?: string;
  companyId?: string;
}

const SELECT =
  "*, contact:contacts(id, first_name, last_name), company:companies(id, name), deal:deals(id, title)";

export function useTasks(filters: TaskFilters = {}) {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    let q = supabase
      .from("tasks" as never)
      .select(SELECT)
      .eq("workspace_id", workspace.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (filters.dealId) q = q.eq("deal_id", filters.dealId);
    if (filters.contactId) q = q.eq("contact_id", filters.contactId);
    if (filters.companyId) q = q.eq("company_id", filters.companyId);
    if (filters.assignees && filters.assignees.length > 0) q = q.in("assignee_id", filters.assignees);
    if (filters.priorities && filters.priorities.length > 0) q = q.in("priority", filters.priorities);
    if (filters.statuses && filters.statuses.length > 0) q = q.in("status", filters.statuses);

    if (filters.dueRange === "today") {
      const t = new Date();
      q = q.gte("due_at", startOfDay(t).toISOString()).lte("due_at", endOfDay(t).toISOString());
    } else if (filters.dueRange === "tomorrow") {
      const t = addDays(new Date(), 1);
      q = q.gte("due_at", startOfDay(t).toISOString()).lte("due_at", endOfDay(t).toISOString());
    } else if (filters.dueRange === "this_week") {
      const t = new Date();
      q = q
        .gte("due_at", startOfWeek(t, { weekStartsOn: 1 }).toISOString())
        .lte("due_at", endOfWeek(t, { weekStartsOn: 1 }).toISOString());
    } else if (filters.dueRange === "overdue") {
      q = q.lt("due_at", new Date().toISOString()).neq("status", "done");
    }

    if (filters.search && filters.search.trim().length > 0) {
      q = q.ilike("title", `%${filters.search.trim()}%`);
    }

    const { data, error } = await q;
    if (error) {
      console.error("tasks list error", error);
      setTasks([]);
    } else {
      setTasks((data as unknown as TaskRecord[]) ?? []);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, filterKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateTaskInput): Promise<TaskRecord | null> => {
      if (!workspace || !user) throw new Error("Not ready");
      // Bump existing tasks down so new task lands at top (sort_order = 0).
      const { data: existing } = await supabase
        .from("tasks" as never)
        .select("id, sort_order")
        .eq("workspace_id", workspace.id);
      if (existing && Array.isArray(existing)) {
        await Promise.all(
          (existing as Array<{ id: string; sort_order: number }>).map((row) =>
            supabase
              .from("tasks" as never)
              .update({ sort_order: (row.sort_order ?? 0) + 1 } as never)
              .eq("id", row.id),
          ),
        );
      }
      const { data, error } = await supabase
        .from("tasks" as never)
        .insert({
          workspace_id: workspace.id,
          creator_id: user.id,
          assignee_id: input.assignee_id ?? user.id,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? "medium",
          status: input.status ?? "todo",
          due_at: input.due_at ?? null,
          contact_id: input.contact_id ?? null,
          company_id: input.company_id ?? null,
          deal_id: input.deal_id ?? null,
          sort_order: 0,
        } as never)
        .select(SELECT)
        .single();
      if (error) throw error;
      await refresh();
      return data as unknown as TaskRecord;
    },
    [workspace, user, refresh],
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      if (!workspace) return;
      const prev = tasks;
      setTasks((curr) => {
        const byId = new Map(curr.map((t) => [t.id, t]));
        const reordered = orderedIds
          .map((id, idx) => {
            const t = byId.get(id);
            return t ? { ...t, sort_order: idx } : null;
          })
          .filter((t): t is TaskRecord => t !== null);
        const seen = new Set(orderedIds);
        const rest = curr.filter((t) => !seen.has(t.id));
        return [...reordered, ...rest];
      });
      try {
        await Promise.all(
          orderedIds.map((id, idx) =>
            supabase
              .from("tasks" as never)
              .update({ sort_order: idx } as never)
              .eq("id", id)
              .eq("workspace_id", workspace.id),
          ),
        );
      } catch (err) {
        setTasks(prev);
        throw err;
      }
    },
    [workspace, tasks],
  );

  const update = useCallback(
    async (id: string, patch: Partial<CreateTaskInput>) => {
      const { error } = await supabase.from("tasks" as never).update(patch as never).eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks" as never).delete().eq("id", id);
    if (error) throw error;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      // Optimistic
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                completed_at: status === "done" ? new Date().toISOString() : null,
              }
            : t,
        ),
      );
      const { error } = await supabase
        .from("tasks" as never)
        .update({ status } as never)
        .eq("id", id);
      if (error) {
        await refresh();
        throw error;
      }
    },
    [refresh],
  );

  return { tasks, loading, refresh, create, update, remove, setStatus, reorder };
}

// Single task fetcher
export function useTask(id: string | undefined) {
  const [task, setTask] = useState<TaskRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks" as never)
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      setTask(null);
      setNotFound(true);
    } else {
      setTask(data as unknown as TaskRecord);
      setNotFound(false);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { task, loading, notFound, refresh };
}
