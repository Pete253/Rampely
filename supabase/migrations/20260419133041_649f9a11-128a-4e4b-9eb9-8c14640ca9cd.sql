-- =========================================
-- deal_contacts join table
-- =========================================
CREATE TABLE public.deal_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX deal_contacts_deal_contact_uniq
  ON public.deal_contacts (deal_id, contact_id);

CREATE INDEX deal_contacts_deal_idx ON public.deal_contacts (deal_id);
CREATE INDEX deal_contacts_contact_idx ON public.deal_contacts (contact_id);

ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members access deal_contacts"
  ON public.deal_contacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_contacts.deal_id
        AND public.is_workspace_member(d.workspace_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_contacts.deal_id
        AND public.is_workspace_member(d.workspace_id, auth.uid())
    )
  );

-- Backfill from existing deals.contact_id
INSERT INTO public.deal_contacts (deal_id, contact_id, is_primary)
SELECT id, contact_id, true
FROM public.deals
WHERE contact_id IS NOT NULL
ON CONFLICT (deal_id, contact_id) DO NOTHING;

-- =========================================
-- deal_stage_history table
-- =========================================
CREATE TABLE public.deal_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ
);

CREATE INDEX deal_stage_history_deal_idx
  ON public.deal_stage_history (deal_id, entered_at);

ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members access deal_stage_history"
  ON public.deal_stage_history
  FOR ALL
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- Trigger function: log stage changes
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.deal_stage_history (deal_id, stage_id, workspace_id, entered_at)
    VALUES (NEW.id, NEW.stage_id, NEW.workspace_id, COALESCE(NEW.created_at, now()));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    UPDATE public.deal_stage_history
       SET exited_at = now()
     WHERE deal_id = NEW.id
       AND exited_at IS NULL;

    INSERT INTO public.deal_stage_history (deal_id, stage_id, workspace_id, entered_at)
    VALUES (NEW.id, NEW.stage_id, NEW.workspace_id, now());
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_deal_insert_log_stage
AFTER INSERT ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_stage_change();

CREATE TRIGGER on_deal_update_log_stage
AFTER UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_stage_change();

-- Backfill existing deals: one open row per deal at created_at
INSERT INTO public.deal_stage_history (deal_id, stage_id, workspace_id, entered_at)
SELECT id, stage_id, workspace_id, created_at
FROM public.deals;
