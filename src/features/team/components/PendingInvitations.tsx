import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvitations } from "../hooks/useInvitations";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export function PendingInvitations() {
  const { invitations, memberEmails, loading, cancelInvitation, resendInvitation } =
    useInvitations();
  const { role } = useWorkspace();
  const [busy, setBusy] = useState<string | null>(null);

  const canManage = role === "owner" || role === "admin";

  if (loading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (invitations.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No pending invitations.
      </div>
    );
  }

  const handleResend = async (id: string, email: string) => {
    setBusy(id);
    try {
      await resendInvitation(id);
      toast.success(`Invitation resent to ${email}`);
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to resend");
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async (id: string) => {
    setBusy(id);
    try {
      await cancelInvitation(id);
      toast.success("Invitation cancelled");
    } catch (err) {
      toast.error((err as Error).message ?? "Failed to cancel");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Invited by</TableHead>
            <TableHead>Sent</TableHead>
            {canManage && <TableHead className="w-40 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span>{inv.email}</span>
                  {memberEmails.has(inv.email.toLowerCase()) && (
                    <Badge variant="outline" className="text-xs">
                      Already a member
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{inv.role}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {inv.inviter_name ?? "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy === inv.id}
                      onClick={() => handleResend(inv.id, inv.email)}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy === inv.id}
                      onClick={() => handleCancel(inv.id)}
                      className="text-destructive"
                    >
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
