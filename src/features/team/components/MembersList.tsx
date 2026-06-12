import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkspaceMembers } from "../hooks/useWorkspaceMembers";
import { MemberActions } from "./MemberActions";
import { TransferOwnershipDialog } from "./TransferOwnershipDialog";
import type { AppRole } from "@/shared/lib/types";

function roleBadge(role: AppRole) {
  if (role === "owner") {
    return <Badge className="border-warning/30 bg-warning/15 text-warning">Owner</Badge>;
  }
  if (role === "admin") {
    return <Badge className="border-primary/30 bg-primary/15 text-primary-light">Admin</Badge>;
  }
  return <Badge variant="secondary">Member</Badge>;
}

function initials(name: string | null | undefined, email: string | null | undefined) {
  const src = name?.trim() || email?.trim() || "?";
  return src
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MembersList() {
  const { workspace, role, refresh } = useWorkspace();
  const { user } = useAuth();
  const {
    members,
    loading,
    updateRole,
    removeMember,
    refresh: refreshMembers,
  } = useWorkspaceMembers();
  const [transferOpen, setTransferOpen] = useState(false);

  if (!workspace) return null;

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Just you so far. Invite your team to collaborate.
      </div>
    );
  }

  const ownerCount = members.filter((m) => m.role === "owner").length;
  const callerRole: AppRole = role ?? "member";
  const isOwner = callerRole === "owner";

  const transferCandidates = members.filter((m) => m.user_id !== user?.id && m.role !== "owner");

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isMe = m.user_id === user?.id;
              const canTransfer = isOwner && isMe && transferCandidates.length > 0;
              return (
                <TableRow key={m.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initials(m.profile?.full_name, m.profile?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {m.profile?.full_name ?? "Unknown"}
                          {isMe && (
                            <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {m.profile?.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{roleBadge(m.role)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <MemberActions
                      member={m}
                      workspaceName={workspace.name}
                      isCurrentUser={isMe}
                      callerRole={callerRole}
                      ownerCount={ownerCount}
                      canTransferOwnership={canTransfer}
                      onTransferOwnership={() => setTransferOpen(true)}
                      onUpdateRole={updateRole}
                      onRemove={async (id) => {
                        await removeMember(id);
                        if (id === user?.id) {
                          // User left their own workspace — refresh workspace context
                          await refresh();
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {isOwner && (
        <TransferOwnershipDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          candidates={transferCandidates}
          onTransferred={async () => {
            await refreshMembers();
            await refresh();
          }}
        />
      )}
    </>
  );
}
