import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RampelyLockup } from "@/shared/components/brand/RampelyLockup";
import { useAuth } from "@/shared/hooks/useAuth";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const heading = profile ? "Welcome back" : "Welcome to Rampely";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login", search: { invite_token: undefined, email: undefined }, replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex justify-center">
          <RampelyLockup height={48} className="text-foreground" />
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{heading}</h1>
          <p className="mt-3 text-base text-muted-foreground">
            You're not currently part of a workspace. What would you like to do?
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-4 border-primary/40 bg-card p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Create your own workspace</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Start your own workspace and invite your team. You'll be the owner.
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="w-full">
              Create workspace
            </Button>
          </Card>

          <Card className="flex flex-col gap-4 bg-muted/30 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <UserPlus size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Wait for an invitation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask a colleague to invite you from their workspace settings, then accept the invitation in your email.
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>

      <CreateWorkspaceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
