import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { AuthLogo, AuthShell } from "@/shared/components/AuthShell";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => ({
    invite_token: typeof search.invite_token === "string" ? search.invite_token : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { invite_token, email: emailParam } = Route.useSearch();
  const [email, setEmail] = useState(emailParam ?? "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Persist invite token so the _authenticated.tsx rescue redirect can find it
  // after auth completes (mirrors signup.tsx). Cleared on successful accept.
  useEffect(() => {
    if (!invite_token) return;
    try {
      sessionStorage.setItem("pending_invite_token", invite_token);
    } catch {
      // sessionStorage can be unavailable (private mode) — non-fatal
    }
  }, [invite_token]);

  useEffect(() => {
    if (loading || !session) return;
    let storedToken: string | null = null;
    try {
      storedToken = sessionStorage.getItem("pending_invite_token");
    } catch {
      // sessionStorage can be unavailable (private mode) — non-fatal
    }
    const effectiveToken = invite_token ?? storedToken ?? undefined;
    if (effectiveToken) {
      navigate({ to: "/invite/$token", params: { token: effectiveToken }, replace: true });
    } else {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, navigate, invite_token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    let storedToken: string | null = null;
    try {
      storedToken = sessionStorage.getItem("pending_invite_token");
    } catch {
      // sessionStorage can be unavailable (private mode) — non-fatal
    }
    const effectiveToken = invite_token ?? storedToken ?? undefined;
    if (effectiveToken) {
      navigate({ to: "/invite/$token", params: { token: effectiveToken }, replace: true });
    } else {
      navigate({ to: "/dashboard", replace: true });
    }
  };

  return (
    <AuthShell className="p-7">
      <div className="mb-7 text-center">
        <AuthLogo height={40} />
        <p className="mt-3 text-sm text-white/55">Sign in to your workspace</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-white/55">
        No account?{" "}
        <Link
          to="/signup"
          search={{ invite_token: undefined, email: undefined }}
          className="font-semibold text-primary-light hover:underline"
        >
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
