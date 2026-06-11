-- Enums
CREATE TYPE public.event_type AS ENUM ('meeting', 'call', 'other');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');

-- calendar_events
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  event_type public.event_type NOT NULL DEFAULT 'meeting',
  location text,
  video_url text,
  owner_id uuid NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_workspace_range ON public.calendar_events (workspace_id, start_at, end_at);
CREATE INDEX idx_calendar_events_deal ON public.calendar_events (deal_id);
CREATE INDEX idx_calendar_events_contact ON public.calendar_events (contact_id);
CREATE INDEX idx_calendar_events_company ON public.calendar_events (company_id);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read calendar_events"
  ON public.calendar_events FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members insert calendar_events"
  ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND owner_id = auth.uid());

CREATE POLICY "Owner or admins update calendar_events"
  ON public.calendar_events FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      owner_id = auth.uid()
      OR public.has_workspace_role(workspace_id, auth.uid(), 'owner'::app_role)
      OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Owner or admins delete calendar_events"
  ON public.calendar_events FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      owner_id = auth.uid()
      OR public.has_workspace_role(workspace_id, auth.uid(), 'owner'::app_role)
      OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::app_role)
    )
  );

-- end_at > start_at validation trigger
CREATE OR REPLACE FUNCTION public.validate_calendar_event_times()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION 'end_at must be after start_at';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calendar_events_validate_times
  BEFORE INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_calendar_event_times();

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'todo',
  due_at timestamptz,
  assignee_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_workspace ON public.tasks (workspace_id);
CREATE INDEX idx_tasks_assignee ON public.tasks (assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks (workspace_id, status);
CREATE INDEX idx_tasks_due ON public.tasks (workspace_id, due_at);
CREATE INDEX idx_tasks_deal ON public.tasks (deal_id);
CREATE INDEX idx_tasks_contact ON public.tasks (contact_id);
CREATE INDEX idx_tasks_company ON public.tasks (company_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members insert tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND creator_id = auth.uid());

CREATE POLICY "Creator assignee or admins update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      creator_id = auth.uid()
      OR assignee_id = auth.uid()
      OR public.has_workspace_role(workspace_id, auth.uid(), 'owner'::app_role)
      OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Creator assignee or admins delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      creator_id = auth.uid()
      OR assignee_id = auth.uid()
      OR public.has_workspace_role(workspace_id, auth.uid(), 'owner'::app_role)
      OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::app_role)
    )
  );

-- completed_at automation
CREATE OR REPLACE FUNCTION public.handle_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done' OR NEW.completed_at IS NULL) THEN
    NEW.completed_at = COALESCE(NEW.completed_at, now());
  ELSIF NEW.status <> 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_completion
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_completion();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();