import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    navigate({
      to: "/login",
      search: { invite_token: undefined, email: undefined },
      replace: true,
    });
  };

  return (
    <div className="bg-hero-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex justify-center">
          <RampelyLockup height={48} className="text-white" />
        </div>
        <div className="mb-8 text-center">
          <h1 className="heading-display text-4xl text-white">{heading}</h1>
          <p className="mt-3 text-base text-white/65">
            You're not currently part of a workspace. What would you like to do?
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="shadow-modal flex flex-col gap-4 rounded-xl border border-white/20 bg-app-bg/85 p-6 backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/20 text-primary-light">
              <Building2 size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-extrabold tracking-[-0.02em] text-white">
                Create your own workspace
              </h2>
              <p className="mt-1 text-sm text-white/55">
                Start your own workspace and invite your team. You'll be the owner.
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="w-full">
              Create workspace
            </Button>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-white/12 bg-app-bg/60 p-6 backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/8 text-white/60">
              <UserPlus size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-extrabold tracking-[-0.02em] text-white">
                Wait for an invitation
              </h2>
              <p className="mt-1 text-sm text-white/55">
                Ask a colleague to invite you from their workspace settings, then accept the
                invitation in your email.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-white/55 transition-colors hover:text-white hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>

      <CreateWorkspaceDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
