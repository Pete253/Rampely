import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import type { AppRole, Profile } from "@/shared/lib/types";

export interface MemberRow {
  user_id: string;
  role: AppRole;
  joined_at: string;
  profile: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
}

const ROLE_RANK: Record<AppRole, number> = { owner: 0, admin: 1, member: 2 };

async function fetchWorkspaceMembers(workspaceId: string): Promise<MemberRow[]> {
  // Step 1: fetch membership rows
  const { data: members, error: mErr } = await supabase
    .from("workspace_members")
    .select("user_id, role, joined_at")
    .eq("workspace_id", workspaceId);
  if (mErr) throw mErr;

  const userIds = (members ?? []).map((m) => m.user_id);

  // Step 2: fetch matching profiles (separate query so RLS evaluates per-table)
  let profilesById: Record<string, MemberRow["profile"]> = {};
  if (userIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", userIds);
    if (pErr) throw pErr;
    profilesById = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p as MemberRow["profile"]]),
    );
  }

  const rows: MemberRow[] = (members ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role as AppRole,
    joined_at: m.joined_at,
    profile: profilesById[m.user_id] ?? null,
  }));

  rows.sort((a, b) => {
    const r = ROLE_RANK[a.role] - ROLE_RANK[b.role];
    if (r !== 0) return r;
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  return rows;
}

export function useWorkspaceMembers() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = workspace?.id;

  const query = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembers(workspaceId!),
    enabled: !!workspaceId,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["workspace-members", workspaceId] }),
    [queryClient, workspaceId],
  );

  const refresh = useCallback(async () => {
    await invalidate();
  }, [invalidate]);

  const updateRole = async (userId: string, role: AppRole) => {
    if (!workspaceId) return;
    const { error } = await supabase
      .from("workspace_members")
      .update({ role })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
    if (error) throw error;
    await invalidate();
  };

  const removeMember = async (userId: string) => {
    if (!workspaceId) return;
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
    if (error) throw error;
    await invalidate();
  };

  return {
    members: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refresh,
    updateRole,
    removeMember,
  };
}
