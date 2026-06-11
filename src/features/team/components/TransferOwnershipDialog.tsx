import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/shared/lib/supabase";
import type { MemberRow } from "../hooks/useWorkspaceMembers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
  candidates: MemberRow[]; // members eligible to receive ownership (not current user, not other owners)
  onTransferred: () => void;
}

export function TransferOwnershipDialog({ open, onOpenChange, workspaceId, workspaceName, candidates, onTransferred }: Props) {
  const [targetId, setTargetId] = useState<string>("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setTargetId(""); setConfirm(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) { toast.error("Choose a new owner"); return; }
    if (confirm.trim().toLowerCase() !== "transfer") {
      toast.error('Type "transfer" to confirm'); return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("transfer_workspace_ownership", {
      _workspace_id: workspaceId,
      _new_owner_id: targetId,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ownership transferred");
    reset();
    onOpenChange(false);
    onTransferred();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer ownership of {workspaceName}</DialogTitle>
          <DialogDescription>
            You'll be demoted to Admin. Only the new owner will be able to delete the workspace or transfer ownership again.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transfer-target">New owner</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger id="transfer-target"><SelectValue placeholder="Select a member" /></SelectTrigger>
              <SelectContent>
                {candidates.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name ?? m.profile?.email ?? "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer-confirm">Type <span className="font-mono">transfer</span> to confirm</Label>
            <Input id="transfer-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} variant="destructive">
              {submitting ? "Transferring…" : "Transfer ownership"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}