import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export type EventType = "meeting" | "call" | "other";

export interface CalendarEvent {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  event_type: EventType;
  location: string | null;
  video_url: string | null;
  color: string | null;
  owner_id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
  contact?: { id: string; first_name: string; last_name: string | null } | null;
  company?: { id: string; name: string } | null;
  deal?: { id: string; title: string } | null;
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  start_at: string;
  end_at: string;
  event_type: EventType;
  location?: string | null;
  video_url?: string | null;
  color?: string | null;
  contact_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
}

const SELECT =
  "*, contact:contacts(id, first_name, last_name), company:companies(id, name), deal:deals(id, title)";

export function useCalendarEvents(args: { from: Date; to: Date }) {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const fromIso = args.from.toISOString();
  const toIso = args.to.toISOString();

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("calendar_events" as never)
      .select(SELECT)
      .eq("workspace_id", workspace.id)
      .lt("start_at", toIso)
      .gt("end_at", fromIso)
      .order("start_at", { ascending: true });
    if (error) {
      console.error("calendar_events list error", error);
      setEvents([]);
    } else {
      setEvents((data as unknown as CalendarEvent[]) ?? []);
    }
    setLoading(false);
  }, [workspace, fromIso, toIso]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateEventInput): Promise<CalendarEvent | null> => {
      if (!workspace || !user) throw new Error("Not ready");
      const { data, error } = await supabase
        .from("calendar_events" as never)
        .insert({
          workspace_id: workspace.id,
          owner_id: user.id,
          title: input.title,
          description: input.description ?? null,
          start_at: input.start_at,
          end_at: input.end_at,
          event_type: input.event_type,
          location: input.location ?? null,
          video_url: input.video_url ?? null,
          color: input.color ?? null,
          contact_id: input.contact_id ?? null,
          company_id: input.company_id ?? null,
          deal_id: input.deal_id ?? null,
        } as never)
        .select(SELECT)
        .single();
      if (error) throw error;
      await refresh();
      return data as unknown as CalendarEvent;
    },
    [workspace, user, refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<CreateEventInput>) => {
      // Optimistic update
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? ({ ...e, ...patch } as CalendarEvent) : e)),
      );
      const { error } = await supabase
        .from("calendar_events" as never)
        .update(patch as never)
        .eq("id", id);
      if (error) {
        await refresh();
        throw error;
      }
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("calendar_events" as never)
      .delete()
      .eq("id", id);
    if (error) throw error;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { events, loading, refresh, create, update, remove };
}
