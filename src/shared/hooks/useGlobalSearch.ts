import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export interface SearchResult {
  id: string;
  label: string;
  secondary?: string | null;
}

export interface RecentRecord {
  id: string;
  type: string;
  label: string;
  secondary: string | null;
  updated_at: string;
}

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function escapeIlike(q: string): string {
  // Escape % and _ for ilike, then wrap with % for substring match
  return q.replace(/[%_]/g, "\\$&");
}

export function useGlobalSearch(query: string) {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? null;
  const debounced = useDebounced(query, 150).trim();
  const enabled = !!workspaceId && debounced.length > 0;
  const ilike = `%${escapeIlike(debounced)}%`;

  const companies = useQuery({
    queryKey: ["global-search", workspaceId, "company", debounced],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, website, industry")
        .eq("workspace_id", workspaceId!)
        .or(`name.ilike.${ilike},website.ilike.${ilike},industry.ilike.${ilike}`)
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id,
        label: c.name,
        secondary: c.industry ?? c.website ?? null,
      }));
    },
  });

  const contacts = useQuery({
    queryKey: ["global-search", workspaceId, "contact", debounced],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, title, companies(name)")
        .eq("workspace_id", workspaceId!)
        .or(
          `first_name.ilike.${ilike},last_name.ilike.${ilike},email.ilike.${ilike},title.ilike.${ilike}`,
        )
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((c) => {
        const companyName =
          (c as unknown as { companies: { name: string } | null }).companies?.name ?? null;
        return {
          id: c.id,
          label: `${c.first_name} ${c.last_name ?? ""}`.trim(),
          secondary: companyName ?? c.email ?? c.title ?? null,
        };
      });
    },
  });

  const deals = useQuery({
    queryKey: ["global-search", workspaceId, "deal", debounced],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, description, status")
        .eq("workspace_id", workspaceId!)
        .or(`title.ilike.${ilike},description.ilike.${ilike}`)
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((d) => ({
        id: d.id,
        label: d.title,
        secondary: d.status,
      }));
    },
  });

  const tasks = useQuery({
    queryKey: ["global-search", workspaceId, "task", debounced],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, due_at, status")
        .eq("workspace_id", workspaceId!)
        .or(`title.ilike.${ilike},description.ilike.${ilike}`)
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        label: t.title,
        secondary: t.due_at ? `Due ${new Date(t.due_at).toLocaleDateString()}` : t.status,
      }));
    },
  });

  const events = useQuery({
    queryKey: ["global-search", workspaceId, "event", debounced],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, title, description, location, start_at")
        .eq("workspace_id", workspaceId!)
        .or(`title.ilike.${ilike},description.ilike.${ilike},location.ilike.${ilike}`)
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((e) => ({
        id: e.id,
        label: e.title,
        secondary: e.start_at ? new Date(e.start_at).toLocaleString() : e.location,
      }));
    },
  });

  const activities = useQuery({
    queryKey: ["global-search", workspaceId, "activity", debounced],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<SearchResult[]> => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, subject, body, type, created_at")
        .eq("workspace_id", workspaceId!)
        .or(`subject.ilike.${ilike},body.ilike.${ilike}`)
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((a) => ({
        id: a.id,
        label: a.subject ?? a.type,
        secondary: a.created_at ? new Date(a.created_at).toLocaleDateString() : a.type,
      }));
    },
  });

  const recents = useQuery({
    queryKey: ["global-recents", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<RecentRecord[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("rpt_global_recents", {
        _workspace_id: workspaceId!,
        _limit: 5,
      });
      if (error) throw error;
      return (data as unknown as RecentRecord[]) ?? [];
    },
  });

  return {
    debouncedQuery: debounced,
    companies: companies.data ?? [],
    contacts: contacts.data ?? [],
    deals: deals.data ?? [],
    tasks: tasks.data ?? [],
    events: events.data ?? [],
    activities: activities.data ?? [],
    recents: recents.data ?? [],
    isLoading:
      companies.isFetching ||
      contacts.isFetching ||
      deals.isFetching ||
      tasks.isFetching ||
      events.isFetching ||
      activities.isFetching,
  };
}
