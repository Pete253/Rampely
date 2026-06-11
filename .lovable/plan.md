# Robust invitation flow: token propagation + trigger safety net

## What I found in the code

**`src/routes/login.tsx`** — email/password only. **No Google OAuth button.** No `validateSearch` for invite params.

**`src/routes/invite.$token.tsx`**:
- "Sign up to accept" → `/signup` with `{ invite_token, email }` ✓
- "I already have an account" → `/login` with **no params** ✗ — invite token is dropped
- `useEffect` line 40 calls `sessionStorage.removeItem("pending_invite_token")` on mount, which can wipe the rescue token before the unauthenticated branch even renders.

So the strict "OAuth" hypothesis isn't reproducible from this app's UI, but the trigger-level safety net is still the most important fix because:
- The DB shows users arriving with metadata that didn't come from `supabase.auth.signUp({ data })`.
- Even with perfect frontend code, any future signup path (OAuth, magic link, admin-created user, etc.) will silently break the invite flow.

## Plan

### 1. Diagnostic logging in `src/routes/signup.tsx`
Right before `await supabase.auth.signUp(...)`:
```ts
console.log("SIGNUP DEBUG:", {
  email,
  inviteTokenFromUrl: invite_token,
  inviteTokenFromStorage: storedToken,
  effectiveToken,
  dataBeingSent: effectiveToken
    ? { full_name: fullName, skip_workspace_creation: true }
    : { full_name: fullName },
});
```

### 2. Fix Part 1A — propagate invite token from `invite.$token.tsx` to login
- Change "I already have an account" link to `/login` with `search={{ invite_token: token, email: invitation.email }}`.
- Persist `invite_token` to `sessionStorage` on the unauthenticated branch render (instead of wiping it on mount). Move the `removeItem` call to run only **after** a successful `accept_invitation()` (in `handleAccept`) so it survives the round-trip through login/signup.

### 3. Fix Part 1B — `src/routes/login.tsx`
- Add `validateSearch` accepting `invite_token` and `email` (mirror signup.tsx).
- On mount, if `invite_token` is in URL, write it to `sessionStorage.pending_invite_token` (mirrors signup.tsx fallback so the `_authenticated.tsx` rescue path catches it).
- Pre-fill the email field from the `email` search param (read-only when invite_token present).
- After successful sign-in, if an `invite_token` is present (URL or sessionStorage), navigate to `/invite/$token` instead of `/dashboard`. Same in the "already-signed-in" `useEffect`.
- No Google button to modify (none exists). If Google OAuth is added later, the same `redirectTo: /invite/${token}` pattern should be used.

### 4. Fix Part 2 — trigger safety net (migration)
Update `public.handle_new_user()` to skip workspace creation when the new user's email matches a valid pending invitation. Two independent skip conditions, each with a comment:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _full_name TEXT;
  _workspace_id UUID;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, _full_name);

  -- Skip #1: explicit signal from the email/password signup form
  -- (sent as options.data.skip_workspace_creation when accepting an invite).
  IF (NEW.raw_user_meta_data->>'skip_workspace_creation') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Skip #2 (safety net): the user has at least one valid pending invitation
  -- to an existing workspace. Covers OAuth signups, magic links, admin-created
  -- users, or any future path where the explicit flag isn't set. Acceptance
  -- still happens via accept_invitation() once the user lands on /invite/$token.
  IF EXISTS (
    SELECT 1 FROM public.workspace_invitations
    WHERE lower(email) = lower(NEW.email)
      AND accepted_at IS NULL
      AND expires_at > now()
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.workspaces (name)
  VALUES (_full_name || '''s Workspace')
  RETURNING id INTO _workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;
```

## Files

- migration: update `handle_new_user()` with safety-net skip
- `src/routes/signup.tsx` — add diagnostic console.log
- `src/routes/login.tsx` — add validateSearch, sessionStorage persistence, post-login redirect to invite
- `src/routes/invite.$token.tsx` — pass params to /login, move sessionStorage cleanup to after accept

## Verification

1. Invite a fresh email, click link while signed out → "I already have an account" → URL contains `?invite_token=…&email=…`. Sign in → lands on `/invite/$token` → accept → joins workspace, no auto-workspace created.
2. Sign up via the form → console shows `SIGNUP DEBUG` with `effectiveToken` populated → DB: no auto-workspace, `accept_invitation` succeeds.
3. Even if a user is created via any other path (e.g., direct OAuth) with a matching pending invitation, the trigger now skips workspace creation; `_authenticated.tsx` rescue redirects them to `/invite/$token`.
