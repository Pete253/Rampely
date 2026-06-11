
DROP POLICY IF EXISTS "Authenticated create workspace" ON public.workspaces;
-- Workspaces are created exclusively by the signup trigger (SECURITY DEFINER).
-- Direct user-initiated inserts are not allowed; multi-workspace creation
-- will be added later as a server function with proper checks.
CREATE POLICY "No direct workspace inserts" ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (false);
