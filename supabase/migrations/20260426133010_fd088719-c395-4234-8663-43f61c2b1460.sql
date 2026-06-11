-- =========================================================
-- 1. workspace_invitations table
-- =========================================================
CREATE TABLE public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_invitations_role_check CHECK (role IN ('admin', 'member'))
);

CREATE INDEX idx_workspace_invitations_token ON public.workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_workspace ON public.workspace_invitations(workspace_id);

-- Prevent duplicate pending invitations for the same email per workspace
CREATE UNIQUE INDEX idx_workspace_invitations_pending_unique
  ON public.workspace_invitations(workspace_id, lower(email))
  WHERE accepted_at IS NULL;

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Members can view invitations for their workspace
CREATE POLICY "Members view invitations"
ON public.workspace_invitations
FOR SELECT
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

-- Owners and admins can insert invitations
CREATE POLICY "Owners and admins insert invitations"
ON public.workspace_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_workspace_role(workspace_id, auth.uid(), 'owner'::app_role)
   OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::app_role))
  AND invited_by = auth.uid()
);

-- Owners and admins can update invitations
CREATE POLICY "Owners and admins update invitations"
ON public.workspace_invitations
FOR UPDATE
TO authenticated
USING (
  public.has_workspace_role(workspace_id, auth.uid(), 'owner'::app_role)
  OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::app_role)
);

-- Owners and admins can delete invitations
CREATE POLICY "Owners and admins delete invitations"
ON public.workspace_invitations
FOR DELETE
TO authenticated
USING (
  public.has_workspace_role(workspace_id, auth.uid(), 'owner'::app_role)
  OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::app_role)
);

-- =========================================================
-- 2. Update workspace_members policies — admins can also manage
-- =========================================================
DROP POLICY IF EXISTS "Owners manage members" ON public.workspace_members;

CREATE POLICY "Owners and admins manage members"
ON public.workspace_members
FOR ALL
TO authenticated
USING (
  public.has_workspace_role(workspace_id, auth.uid(), 'owner'::app_role)
  OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_workspace_role(workspace_id, auth.uid(), 'owner'::app_role)
  OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::app_role)
);

-- Allow members to leave (delete their own membership)
CREATE POLICY "Members can leave workspace"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =========================================================
-- 3. Allow owners to delete workspaces
-- =========================================================
CREATE POLICY "Owners delete workspace"
ON public.workspaces
FOR DELETE
TO authenticated
USING (public.has_workspace_role(id, auth.uid(), 'owner'::app_role));

-- =========================================================
-- 4. SECURITY DEFINER RPC: get_invitation_by_token
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE(
  id uuid,
  workspace_id uuid,
  workspace_name text,
  email text,
  role app_role,
  inviter_name text,
  message text,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id,
         i.workspace_id,
         w.name AS workspace_name,
         i.email,
         i.role,
         COALESCE(p.full_name, p.email, 'A teammate') AS inviter_name,
         i.message,
         i.expires_at,
         i.accepted_at,
         i.created_at
  FROM public.workspace_invitations i
  JOIN public.workspaces w ON w.id = i.workspace_id
  LEFT JOIN public.profiles p ON p.id = i.invited_by
  WHERE i.token = _token;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- =========================================================
-- 5. SECURITY DEFINER RPC: accept_invitation
-- =========================================================
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
  _user_id uuid := auth.uid();
  _user_email text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;

  SELECT * INTO _inv
  FROM public.workspace_invitations
  WHERE token = _token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  IF _inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation_already_accepted';
  END IF;

  IF _inv.expires_at <= now() THEN
    RAISE EXCEPTION 'invitation_expired';
  END IF;

  IF lower(_inv.email) <> lower(_user_email) THEN
    RAISE EXCEPTION 'invitation_email_mismatch';
  END IF;

  -- Insert membership (or do nothing if already a member)
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_inv.workspace_id, _user_id, _inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Mark invitation accepted
  UPDATE public.workspace_invitations
  SET accepted_at = now()
  WHERE id = _inv.id;

  RETURN _inv.workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- Ensure workspace_members has a primary key for the ON CONFLICT above
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workspace_members'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (workspace_id, user_id);
  END IF;
END $$;

-- =========================================================
-- 6. SECURITY DEFINER RPC: create_workspace
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_workspace(_name text, _country text DEFAULT 'DK')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _workspace_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'workspace_name_required';
  END IF;

  INSERT INTO public.workspaces (name, country)
  VALUES (trim(_name), COALESCE(_country, 'DK'))
  RETURNING id INTO _workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_workspace_id, _user_id, 'owner');

  RETURN _workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace(text, text) TO authenticated;

-- =========================================================
-- 7. SECURITY DEFINER RPC: delete_workspace
-- =========================================================
CREATE OR REPLACE FUNCTION public.delete_workspace(_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, _user_id, 'owner'::app_role) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  DELETE FROM public.workspaces WHERE id = _workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_workspace(uuid) TO authenticated;

-- =========================================================
-- 8. SECURITY DEFINER RPC: transfer_workspace_ownership
-- =========================================================
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(_workspace_id uuid, _new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.has_workspace_role(_workspace_id, _user_id, 'owner'::app_role) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  IF _user_id = _new_owner_id THEN
    RAISE EXCEPTION 'cannot_transfer_to_self';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _new_owner_id
  ) THEN
    RAISE EXCEPTION 'target_not_member';
  END IF;

  -- Promote new owner
  UPDATE public.workspace_members
  SET role = 'owner'
  WHERE workspace_id = _workspace_id AND user_id = _new_owner_id;

  -- Demote current owner to admin
  UPDATE public.workspace_members
  SET role = 'admin'
  WHERE workspace_id = _workspace_id AND user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_workspace_ownership(uuid, uuid) TO authenticated;

-- =========================================================
-- 9. Update handle_new_user to honor skip_workspace_creation
-- =========================================================
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

  -- Skip workspace creation when invited via the accept-invitation flow
  IF (NEW.raw_user_meta_data->>'skip_workspace_creation') = 'true' THEN
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