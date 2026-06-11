import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "./useAuth";
import type { Workspace, AppRole } from "@/shared/lib/types";

interface WorkspaceContextValue {
  workspace: Workspace | null;
  workspaces: Workspace[];
  role: AppRole | null;
  loading: boolean;
  setActiveWorkspace: (workspaceId: string) => void;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);
const ACTIVE_KEY = "rampely.activeWorkspaceId";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [roles, setRoles] = useState<Record<string, AppRole>>({});
  const [activeId, setActiveId] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null,
  );
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setWorkspaces([]);
      setRoles({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, joined_at, workspaces(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Failed to load workspace memberships:", error);
      setWorkspaces([]);
      setRoles({});
      setLoading(false);
      return;
    }

    const list: Workspace[] = [];
    const roleMap: Record<string, AppRole> = {};
    for (const row of data ?? []) {
      const ws = (row as unknown as { workspaces: Workspace | null }).workspaces;
      if (ws) {
        list.push(ws);
        roleMap[ws.id] = row.role as AppRole;
      }
    }

    setWorkspaces(list);
    setRoles(roleMap);

    if (list.length > 0 && (!activeId || !list.find((w) => w.id === activeId))) {
      setActiveId(list[0].id);
      localStorage.setItem(ACTIVE_KEY, list[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setActiveWorkspace = (workspaceId: string) => {
    setActiveId(workspaceId);
    localStorage.setItem(ACTIVE_KEY, workspaceId);
  };

  const workspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0] ?? null;
  const role = workspace ? (roles[workspace.id] ?? null) : null;

  return (
    <WorkspaceContext.Provider
      value={{ workspace, workspaces, role, loading, setActiveWorkspace, refresh: load }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
