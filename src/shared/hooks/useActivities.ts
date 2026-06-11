import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "./useAuth";
import { useWorkspace } from "./useWorkspace";
import type { ActivityType } from "@/shared/lib/activity-types";

export interface ActivityAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Activity {
  id: string;
  workspace_id: string;
  type: ActivityType;
  subject: string | null;
  body: string | null;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  user_id: string | null;
  created_at: string;
  author?: ActivityAuthor | null;
}

export interface UseActivitiesArgs {
  contactId?: string;
  companyId?: string;
  dealId?: string;
  pageSize?: number;
}

export interface CreateActivityInput {
  type: ActivityType;
  subject?: string | null;
  body?: string | null;
}

const PROFILE_CACHE = new Map<string, ActivityAuthor>();

async function fetchAuthor(userId: string): Promise<ActivityAuthor | null> {
  if (PROFILE_CACHE.has(userId)) return PROFILE_CACHE.get(userId)!;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (data) {
    PROFILE_CACHE.set(userId, data);
    return data;
  }
  return null;
}

export function useActivities({
  contactId,
  companyId,
  dealId,
  pageSize = 20,
}: UseActivitiesArgs) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  const matchesFilter = useCallback(
    (a: Activity) => {
      if (!contactId && !companyId && !dealId) return true;
      return (
        (contactId && a.contact_id === contactId) ||
        (companyId && a.company_id === companyId) ||
        (dealId && a.deal_id === dealId)
      );
    },
    [contactId, companyId, dealId],
  );

  const buildQuery = useCallback(
    (from: number, to: number) => {
      if (!workspace) return null;
      let q = supabase
        .from("activities")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      const ors: string[] = [];
      if (contactId) ors.push(`contact_id.eq.${contactId}`);
      if (companyId) ors.push(`company_id.eq.${companyId}`);
      if (dealId) ors.push(`deal_id.eq.${dealId}`);
      if (ors.length > 0) q = q.or(ors.join(","));
      return q;
    },
    [workspace, contactId, companyId, dealId],
  );

  // Hydrate `author` on rows by looking up profiles (cached). Profiles RLS may
  // only return the current user — others fall back to null.
  const hydrateAuthors = useCallback(
    async (rows: Activity[]): Promise<Activity[]> => {
      const missing = Array.from(
        new Set(
          rows
            .map((r) => r.user_id)
            .filter((id): id is string => !!id && !PROFILE_CACHE.has(id)),
        ),
      );
      if (missing.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", missing);
        for (const p of data ?? []) PROFILE_CACHE.set(p.id, p);
      }
      return rows.map((r) => ({
        ...r,
        author: r.user_id ? (PROFILE_CACHE.get(r.user_id) ?? null) : null,
      }));
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    offsetRef.current = 0;
    const q = buildQuery(0, pageSize - 1);
    if (!q) return;
    const { data, error } = await q;
    if (error) {
      console.error("Failed to load activities:", error);
      setActivities([]);
      setHasMore(false);
    } else {
      const rows = await hydrateAuthors((data ?? []) as unknown as Activity[]);
      setActivities(rows);
      setHasMore(rows.length === pageSize);
      offsetRef.current = rows.length;
    }
    setLoading(false);
  }, [workspace, buildQuery, pageSize, hydrateAuthors]);

  const loadMore = useCallback(async () => {
    if (!workspace || !hasMore) return;
    const from = offsetRef.current;
    const q = buildQuery(from, from + pageSize - 1);
    if (!q) return;
    const { data, error } = await q;
    if (error) {
      console.error("Failed to load more:", error);
      return;
    }
    const rows = await hydrateAuthors((data ?? []) as unknown as Activity[]);
    setActivities((prev) => [...prev, ...rows]);
    setHasMore(rows.length === pageSize);
    offsetRef.current += rows.length;
  }, [workspace, hasMore, buildQuery, pageSize, hydrateAuthors]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime
  useEffect(() => {
    if (!workspace) return;
    const channel = supabase
      .channel(`activities:${workspace.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
          filter: `workspace_id=eq.${workspace.id}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Activity;
            if (!matchesFilter(row)) return;
            setActivities((prev) => {
              if (prev.find((a) => a.id === row.id)) return prev;
              return [row, ...prev];
            });
            if (row.user_id && !PROFILE_CACHE.has(row.user_id)) {
              const author = await fetchAuthor(row.user_id);
              if (author) {
                setActivities((prev) =>
                  prev.map((a) => (a.id === row.id ? { ...a, author } : a)),
                );
              }
            } else if (row.user_id) {
              const author = PROFILE_CACHE.get(row.user_id) ?? null;
              setActivities((prev) =>
                prev.map((a) => (a.id === row.id ? { ...a, author } : a)),
              );
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Activity;
            setActivities((prev) =>
              prev.map((a) => (a.id === row.id ? { ...a, ...row, author: a.author } : a)),
            );
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as Activity;
            setActivities((prev) => prev.filter((a) => a.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace, matchesFilter]);

  const create = useCallback(
    async (input: CreateActivityInput) => {
      if (!workspace || !user) throw new Error("Not ready");
      const tempId = `temp-${Date.now()}`;
      const optimistic: Activity = {
        id: tempId,
        workspace_id: workspace.id,
        type: input.type,
        subject: input.subject ?? null,
        body: input.body ?? null,
        contact_id: contactId ?? null,
        company_id: companyId ?? null,
        deal_id: dealId ?? null,
        user_id: user.id,
        created_at: new Date().toISOString(),
        author: PROFILE_CACHE.get(user.id) ?? {
          id: user.id,
          full_name: user.email ?? null,
          avatar_url: null,
        },
      };
      setActivities((prev) => [optimistic, ...prev]);

      const { data, error } = await supabase
        .from("activities")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          type: input.type,
          subject: input.subject ?? null,
          body: input.body ?? null,
          contact_id: contactId ?? null,
          company_id: companyId ?? null,
          deal_id: dealId ?? null,
        })
        .select("*")
        .single();

      if (error) {
        setActivities((prev) => prev.filter((a) => a.id !== tempId));
        throw error;
      }
      const raw = data as unknown as Activity;
      const [row] = await hydrateAuthors([raw]);
      setActivities((prev) => {
        const filtered = prev.filter((a) => a.id !== tempId && a.id !== row.id);
        return [row, ...filtered];
      });
      return row;
    },
    [workspace, user, contactId, companyId, dealId, hydrateAuthors],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Pick<Activity, "subject" | "body" | "type">>) => {
      if (!workspace) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("activities")
        .update(patch)
        .eq("id", id)
        .eq("workspace_id", workspace.id)
        .select("*")
        .single();
      if (error) throw error;
      const raw = data as unknown as Activity;
      const [row] = await hydrateAuthors([raw]);
      setActivities((prev) => prev.map((a) => (a.id === id ? row : a)));
      return row;
    },
    [workspace, hydrateAuthors],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!workspace) throw new Error("No workspace");
      const prev = activities;
      setActivities((p) => p.filter((a) => a.id !== id));
      const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspace.id);
      if (error) {
        setActivities(prev);
        throw error;
      }
    },
    [workspace, activities],
  );

  return { activities, loading, hasMore, loadMore, create, update, remove, refresh };
}
