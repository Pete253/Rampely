import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { MembersList } from "./MembersList";
import { PendingInvitations } from "./PendingInvitations";
import { InviteMemberDialog } from "./InviteMemberDialog";

export function TeamSettings() {
  const { role } = useWorkspace();
  const [inviteOpen, setInviteOpen] = useState(false);
  const canInvite = role === "owner" || role === "admin";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>People with access to this workspace.</CardDescription>
          </div>
          {canInvite && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <MembersList />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
          <CardDescription>Invitations that haven't been accepted yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <PendingInvitations />
        </CardContent>
      </Card>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
