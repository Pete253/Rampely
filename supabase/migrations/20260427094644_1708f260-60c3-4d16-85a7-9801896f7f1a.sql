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

  -- Skip #1: explicit signal from the email/password signup form.
  -- Sent as options.data.skip_workspace_creation = true when accepting an invite
  -- through the standard signUp() path.
  IF (NEW.raw_user_meta_data->>'skip_workspace_creation') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Skip #2 (safety net): the new user has at least one valid pending
  -- invitation to an existing workspace. Covers OAuth signups, magic links,
  -- admin-created users, or any future signup path where the explicit flag
  -- above isn't set. The user is expected to land on /invite/$token (either
  -- via the OAuth redirectTo or via the rescue redirect in _authenticated.tsx)
  -- and call accept_invitation(), which creates the proper membership.
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