import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/shared/lib/supabase";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { useAuth } from "@/shared/hooks/useAuth";
import type { AppRole } from "@/shared/lib/types";

export interface InvitationRow {
  id: string;
  workspace_id: string;
  email: string;
  role: AppRole;
  token: string;
  invited_by: string;
  inviter_name: string | null;
  message: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

function generateToken(): string {
  // 32+ chars of cryptographic randomness
  const a = crypto.randomUUID().replace(/-/g, "");
  const b = crypto.randomUUID().replace(/-/g, "");
  return (a + b).slice(0, 48);
}

export function useInvitations() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [memberEmails, setMemberEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspace) {
      setInvitations([]);
      setMemberEmails(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);

    // Step 1: fetch invitations without embedded join
    const { data: invites, error } = await supabase
      .from("workspace_invitations")
      .select("id, workspace_id, email, role, token, invited_by, message, expires_at, accepted_at, created_at")
      .eq("workspace_id", workspace.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setInvitations([]);
      setMemberEmails(new Set());
      setLoading(false);
      return;
    }

    // Step 2: fetch inviter profiles separately and merge
    const inviterIds = Array.from(new Set((invites ?? []).map((i) => i.invited_by)));
    let profileMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (inviterIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", inviterIds);
      profileMap = new Map((profiles ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]));
    }

    // Step 3: fetch member emails via two-step pattern (members → profiles)
    const { data: members } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace.id);
    const memberIds = (members ?? []).map((m) => m.user_id);
    let emails = new Set<string>();
    if (memberIds.length > 0) {
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("email")
        .in("id", memberIds);
      emails = new Set(
        (memberProfiles ?? [])
          .map((p) => p.email?.toLowerCase())
          .filter((e): e is string => Boolean(e)),
      );
    }

    const rows: InvitationRow[] = (invites ?? []).map((r) => {
      const inviter = profileMap.get(r.invited_by);
      return {
        id: r.id,
        workspace_id: r.workspace_id,
        email: r.email,
        role: r.role as AppRole,
        token: r.token,
        invited_by: r.invited_by,
        inviter_name: inviter?.full_name ?? inviter?.email ?? null,
        message: r.message,
        expires_at: r.expires_at,
        accepted_at: r.accepted_at,
        created_at: r.created_at,
      };
    });
    setInvitations(rows);
    setMemberEmails(emails);
    setLoading(false);
  }, [workspace]);

  useEffect(() => {
    load();
  }, [load]);

  const sendEmail = async (invitationId: string, isResend = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke("send-invitation-email", {
      body: { invitationId, isResend },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined,
    });
    if (error) throw error;
  };

  const createInvitation = async (params: {
    email: string;
    role: "admin" | "member";
    message?: string;
  }) => {
    if (!workspace || !user) throw new Error("not_ready");
    const email = params.email.trim().toLowerCase();

    // Check not already a member (two-step: members → profiles)
    const { data: members } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace.id);
    const memberIds = (members ?? []).map((m) => m.user_id);
    let existingEmails = new Set<string>();
    if (memberIds.length > 0) {
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("email")
        .in("id", memberIds);
      existingEmails = new Set(
        (memberProfiles ?? [])
          .map((p) => p.email?.toLowerCase())
          .filter((e): e is string => Boolean(e)),
      );
    }
    if (existingEmails.has(email)) {
      throw new Error("Already a member of this workspace");
    }

    // Check no pending invite (DB also enforces this via partial unique index)
    const { data: pending } = await supabase
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", workspace.id)
      .ilike("email", email)
      .is("accepted_at", null)
      .maybeSingle();
    if (pending) {
      throw new Error("An invitation is already pending for this email");
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspace.id,
        email,
        role: params.role,
        token,
        invited_by: user.id,
        message: params.message?.trim() || null,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (error) throw error;

    try {
      await sendEmail(invitation.id);
    } catch (e) {
      // Roll back invitation if email failed so the user can retry
      await supabase.from("workspace_invitations").delete().eq("id", invitation.id);
      throw e;
    }
    await load();
    return invitation.id;
  };

  const cancelInvitation = async (id: string) => {
    const { error } = await supabase.from("workspace_invitations").delete().eq("id", id);
    if (error) throw error;
    await load();
  };

  const resendInvitation = async (id: string) => {
    await sendEmail(id, true);
  };

  return { invitations, memberEmails, loading, refresh: load, createInvitation, cancelInvitation, resendInvitation };
}