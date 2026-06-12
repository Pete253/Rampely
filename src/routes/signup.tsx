import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { AuthLogo, AuthShell } from "@/shared/components/AuthShell";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  validateSearch: (search: Record<string, unknown>) => ({
    invite_token: typeof search.invite_token === "string" ? search.invite_token : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { invite_token, email: emailParam } = Route.useSearch();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(emailParam ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    if (!invite_token) return;
    try {
      sessionStorage.setItem("pending_invite_token", invite_token);
    } catch {
      // sessionStorage can be unavailable (private mode) — non-fatal
    }
    (async () => {
      const { data } = await supabase.rpc("get_invitation_by_token", { _token: invite_token });
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.workspace_name) setWorkspaceName(row.workspace_name);
    })();
  }, [invite_token]);

  useEffect(() => {
    if (!loading && session) {
      let storedToken: string | null = null;
      try {
        storedToken = sessionStorage.getItem("pending_invite_token");
      } catch {
        // sessionStorage can be unavailable (private mode) — non-fatal
      }
      const effectiveToken = invite_token ?? storedToken ?? undefined;
      if (effectiveToken)
        navigate({ to: "/invite/$token", params: { token: effectiveToken }, replace: true });
      else navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, navigate, invite_token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    let storedToken: string | null = null;
    try {
      storedToken = sessionStorage.getItem("pending_invite_token");
    } catch {
      // sessionStorage can be unavailable (private mode) — non-fatal
    }
    const effectiveToken = invite_token ?? storedToken ?? undefined;
    // Diagnostic: prove what's actually being sent to supabase.auth.signUp.
    // Remove once invite signup flow is verified end-to-end.
    console.log("SIGNUP DEBUG:", {
      email,
      inviteTokenFromUrl: invite_token,
      inviteTokenFromStorage: storedToken,
      effectiveToken,
      dataBeingSent: effectiveToken
        ? { full_name: fullName, skip_workspace_creation: true }
        : { full_name: fullName },
    });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: effectiveToken
          ? `${window.location.origin}/invite/${effectiveToken}`
          : `${window.location.origin}/dashboard`,
        data: effectiveToken
          ? { full_name: fullName, skip_workspace_creation: true }
          : { full_name: fullName },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome to Rampely!");
    if (effectiveToken)
      navigate({ to: "/invite/$token", params: { token: effectiveToken }, replace: true });
    else navigate({ to: "/dashboard", replace: true });
  };

  return (
    <AuthShell className="p-7">
      <div className="mb-7 text-center">
        <AuthLogo height={40} />
        <p className="mt-3 text-sm text-white/55">
          {workspaceName ? `Accepting invitation to ${workspaceName}` : "Create your workspace"}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-xs font-semibold text-white/70">
            Full name
          </label>
          <Input
            id="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-white/70">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            readOnly={!!invite_token}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-white/70">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-white/55">
        Already have an account?{" "}
        <Link
          to="/login"
          search={{ invite_token: undefined, email: undefined }}
          className="font-semibold text-primary-light hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
