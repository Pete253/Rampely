import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/shared/lib/supabase";
import { useAuth } from "@/shared/hooks/useAuth";
import { RampelyLockup } from "@/shared/components/brand/RampelyLockup";

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
    try { sessionStorage.setItem("pending_invite_token", invite_token); } catch {}
  }, [invite_token]);

  useEffect(() => {
    if (loading || !session) return;
    let storedToken: string | null = null;
    try { storedToken = sessionStorage.getItem("pending_invite_token"); } catch {}
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
    try { storedToken = sessionStorage.getItem("pending_invite_token"); } catch {}
    const effectiveToken = invite_token ?? storedToken ?? undefined;
    if (effectiveToken) {
      navigate({ to: "/invite/$token", params: { token: effectiveToken }, replace: true });
    } else {
      navigate({ to: "/dashboard", replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="flex justify-center">
            <RampelyLockup height={40} className="text-foreground" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
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
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
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
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/signup" search={{ invite_token: undefined, email: undefined }} className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
