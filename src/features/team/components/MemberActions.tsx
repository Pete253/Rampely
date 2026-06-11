import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { AppRole } from "@/shared/lib/types";
import type { MemberRow } from "../hooks/useWorkspaceMembers";

interface Props {
  member: MemberRow;
  workspaceName: string;
  isCurrentUser: boolean;
  callerRole: AppRole;
  ownerCount: number;
  onUpdateRole: (userId: string, role: AppRole) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  canTransferOwnership?: boolean;
  onTransferOwnership?: () => void;
}

export function MemberActions({
  member,
  workspaceName,
  isCurrentUser,
  callerRole,
  ownerCount,
  onUpdateRole,
  onRemove,
  canTransferOwnership = false,
  onTransferOwnership,
}: Props) {
  const [removeOpen, setRemoveOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState<AppRole>(member.role === "owner" ? "admin" : member.role);

  const isOwnerCaller = callerRole === "owner";
  const isAdminCaller = callerRole === "admin";
  const targetIsOwner = member.role === "owner";

  // Permission gates
  const canChangeRole =
    !isCurrentUser && !targetIsOwner && (isOwnerCaller || isAdminCaller);
  const canRemove =
    !isCurrentUser && (isOwnerCaller || (isAdminCaller && !targetIsOwner));

  const isOnlyOwner = isCurrentUser && member.role === "owner" && ownerCount === 1;

  const handleSaveRole = async () => {
    try {
      await onUpdateRole(member.user_id, newRole);
      toast.success("Role updated");
      setRoleOpen(false);
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to update role");
    }
  };

  const handleRemove = async () => {
    try {
      await onRemove(member.user_id);
      toast.success(isCurrentUser ? "You left the workspace" : "Member removed");
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to remove member");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canChangeRole && (
            <DropdownMenuItem onClick={() => setRoleOpen(true)}>Change role</DropdownMenuItem>
          )}
          {isCurrentUser ? (
            <>
              {canTransferOwnership && onTransferOwnership && (
                <DropdownMenuItem onClick={onTransferOwnership}>
                  Transfer ownership
                </DropdownMenuItem>
              )}
              {canTransferOwnership && <DropdownMenuSeparator />}
              {isOnlyOwner ? (
                <>
                  <DropdownMenuItem disabled className="text-destructive">
                    Leave workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    Transfer ownership before leaving
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onClick={() => setRemoveOpen(true)}
                  className="text-destructive"
                >
                  Leave workspace
                </DropdownMenuItem>
              )}
            </>
          ) : canRemove ? (
            <>
              {canChangeRole && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => setRemoveOpen(true)} className="text-destructive">
              Remove from workspace
            </DropdownMenuItem>
            </>
          ) : null}
          {!canChangeRole && !canRemove && !isCurrentUser && (
            <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCurrentUser
                ? `Leave ${workspaceName}?`
                : `Remove ${member.profile?.full_name ?? member.profile?.email ?? "member"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isCurrentUser
                ? "You will lose access to this workspace immediately."
                : `They will lose access to ${workspaceName} and all its data immediately.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isCurrentUser ? "Leave" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              {member.profile?.full_name ?? member.profile?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="member-role">Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger id="member-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRole}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}