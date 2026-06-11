import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWorkspace } from "@/shared/hooks/useWorkspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RampelyLockup } from "@/shared/components/brand/RampelyLockup";

export const Route = createFileRoute("/invite/$token")({
  component: AcceptInvitePage,
});

interface InvitationData {
  id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
  role: "admin" | "member";
  inviter_name: string;
  message: string | null;
  expires_at: string;
  accepted_at: string | null;
}

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const { session, user, loading: authLoading } = useAuth();
  const { setActiveWorkspace, refresh } = useWorkspace();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Persist the token so the rescue redirect in _authenticated.tsx can find
    // it after a round-trip through /login or /signup (including OAuth).
    // It's cleared only after a successful accept_invitation() call.
    try { sessionStorage.setItem("pending_invite_token", token); } catch {}
    (async () => {
      const { data, error } = await supabase.rpc("get_invitation_by_token", { _token: token });
      if (cancelled) return;
      if (error) { setError(error.message); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setError("Invitation not found"); setLoading(false); return; }
      setInvitation(row as InvitationData);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    const { data, error } = await supabase.rpc("accept_invitation", { _token: token });
    setAccepting(false);
    if (error) { toast.error(error.message); return; }
    try { sessionStorage.removeItem("pending_invite_token"); } catch {}
    toast.success(`Welcome to ${invitation?.workspace_name}!`);
    await refresh();
    if (data) setActiveWorkspace(data as unknown as string);
    setTimeout(() => navigate({ to: "/dashboard", replace: true }), 100);
  };

  const handleDecline = async () => {
    try { sessionStorage.removeItem("pending_invite_token"); } catch {}
    await supabase.from("workspace_invitations").delete().eq("token", token);
    navigate({ to: session ? "/dashboard" : "/login", replace: true });
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading invitation…</div>
      </div>
    );
  }

  // State A — invalid / expired / accepted
  const isExpired = invitation && new Date(invitation.expires_at) <= new Date();
  const isAccepted = invitation?.accepted_at != null;
  if (error || !invitation || isExpired || isAccepted) {
    return (
      <Wrapper>
        <CardHeader>
          <CardTitle>This invitation is no longer valid</CardTitle>
          <CardDescription>
            {isAccepted
              ? "This invitation has already been accepted."
              : isExpired
                ? "This invitation has expired."
                : "We couldn't find this invitation."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/login" search={{ invite_token: undefined, email: undefined }}>Go to Rampely</Link>
          </Button>
        </CardContent>
      </Wrapper>
    );
  }

  const userEmail = user?.email?.toLowerCase();
  const inviteEmail = invitation.email.toLowerCase();
  const matchesUser = userEmail === inviteEmail;

  // State B — not logged in
  if (!session) {
    return (
      <Wrapper>
        <InviteCard invitation={invitation} />
        <CardContent className="space-y-2 pt-0">
          <Button asChild className="w-full">
            <Link to="/signup" search={{ invite_token: token, email: invitation.email }}>
              Sign up to accept
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login" search={{ invite_token: token, email: invitation.email }}>
              I already have an account
            </Link>
          </Button>
        </CardContent>
      </Wrapper>
    );
  }

  // State B — logged in with wrong email
  if (!matchesUser) {
    return (
      <Wrapper>
        <InviteCard invitation={invitation} />
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm text-muted-foreground">
            This invitation is for <strong>{invitation.email}</strong>. You're signed in as <strong>{user?.email}</strong>.
            Sign out and sign in with the correct email to accept.
          </p>
          <Button variant="outline" className="w-full" onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/login", search: { invite_token: token, email: invitation.email } });
          }}>Sign out</Button>
        </CardContent>
      </Wrapper>
    );
  }

  // State C — matched, ready to accept
  return (
    <Wrapper>
      <InviteCard invitation={invitation} />
      <CardContent className="space-y-2 pt-0">
        <Button className="w-full" onClick={handleAccept} disabled={accepting}>
          {accepting ? "Accepting…" : "Accept invitation"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={handleDecline}>Decline</Button>
      </CardContent>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <div className="px-6 pt-6 text-center">
          <div className="flex justify-center"><RampelyLockup height={32} className="text-foreground" /></div>
        </div>
        {children}
      </Card>
    </div>
  );
}

function InviteCard({ invitation }: { invitation: InvitationData }) {
  return (
    <>
      <CardHeader>
        <CardTitle>You've been invited</CardTitle>
        <CardDescription>
          <strong>{invitation.inviter_name}</strong> invited you to join{" "}
          <strong>{invitation.workspace_name}</strong> as a{" "}
          <Badge variant="secondary" className="capitalize">{invitation.role}</Badge>
        </CardDescription>
      </CardHeader>
      {invitation.message && (
        <CardContent className="pt-0">
          <div className="rounded-md border-l-2 border-primary bg-muted/40 p-3 text-sm italic text-muted-foreground">
            "{invitation.message}"
          </div>
        </CardContent>
      )}
    </>
  );
}