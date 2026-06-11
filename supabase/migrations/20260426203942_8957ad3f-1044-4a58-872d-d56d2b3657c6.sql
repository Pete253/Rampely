ALTER TABLE public.workspace_invitations
  ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0;