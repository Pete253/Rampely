import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/shared/hooks/useAuth";
import { AppLayout } from "@/shared/components/AppLayout";
import { PendingCreateProvider } from "@/shared/contexts/PendingCreateContext";
import { CommandPaletteProvider } from "@/shared/components/search/use-command-palette";
import { CommandPalette } from "@/shared/components/search/CommandPalette";
import { ShortcutsHelpProvider, useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/shared/components/KeyboardShortcutsHelp";
import { CountryOnboardingDialog } from "@/shared/components/onboarding/CountryOnboardingDialog";
import { useWorkspace } from "@/shared/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function ShortcutsBinder() {
  useKeyboardShortcuts();
  return null;
}

function OnboardingGate() {
  const { workspace } = useWorkspace();
  if (!workspace || workspace.onboarding_completed) return null;
  return <CountryOnboardingDialog />;
}

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const { workspaces, loading: workspacesLoading } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session)
      navigate({
        to: "/login",
        search: { invite_token: undefined, email: undefined },
        replace: true,
      });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (loading || !session || workspacesLoading) return;
    if (workspaces.length === 0 && location.pathname !== "/welcome") {
      let pendingToken: string | null = null;
      try {
        pendingToken = sessionStorage.getItem("pending_invite_token");
      } catch {
        // sessionStorage can be unavailable (private mode) — non-fatal
      }
      if (pendingToken) {
        navigate({ to: "/invite/$token", params: { token: pendingToken }, replace: true });
      } else {
        navigate({ to: "/welcome", replace: true });
      }
    } else if (workspaces.length > 0 && location.pathname === "/welcome") {
      navigate({ to: "/reports", replace: true });
    }
  }, [loading, session, workspacesLoading, workspaces.length, location.pathname, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Gate render while workspaces load, or while a redirect to /welcome is pending
  const redirectPending =
    !workspacesLoading && workspaces.length === 0 && location.pathname !== "/welcome";
  if (workspacesLoading || redirectPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Welcome screen renders its own full-page layout — bypass AppLayout
  if (location.pathname === "/welcome") {
    return <Outlet />;
  }

  return (
    <PendingCreateProvider>
      <CommandPaletteProvider>
        <ShortcutsHelpProvider>
          <ShortcutsBinder />
          <AppLayout>
            <Outlet />
          </AppLayout>
          <CommandPalette />
          <KeyboardShortcutsHelp />
          <OnboardingGate />
        </ShortcutsHelpProvider>
      </CommandPaletteProvider>
    </PendingCreateProvider>
  );
}
