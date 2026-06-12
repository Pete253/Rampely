import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import type { AppRole, Workspace } from "@/shared/lib/types";

export interface UserWorkspaceEntry {
  workspace: Workspace;
  role: AppRole;
}

export function useUserWorkspaces() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<UserWorkspaceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("workspace_members")
      .select("role, joined_at, workspaces(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true });
    if (error) {
      console.error("Failed to load workspaces:", error);
      setEntries([]);
      setLoading(false);
      return;
    }
    const list: UserWorkspaceEntry[] = [];
    for (const row of data ?? []) {
      const ws = (row as unknown as { workspaces: Workspace | null }).workspaces;
      if (ws) list.push({ workspace: ws, role: row.role as AppRole });
    }
    setEntries(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, loading, refresh: load };
}
