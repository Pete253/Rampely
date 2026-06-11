-- Additive policy: members of the same workspace can view each other's profiles
CREATE POLICY "Members view co-workspace profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members me
    JOIN public.workspace_members them
      ON them.workspace_id = me.workspace_id
    WHERE me.user_id = auth.uid()
      AND them.user_id = profiles.id
  )
);