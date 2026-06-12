-- Bookings: booked meetings (BDR output) with outcome registration.
-- Datamodel contract (master build prompt §3): workspace_id, deal_id?,
-- contact_id, booked_by, held_at, outcome, quality_score?.
-- Bookings write to the shared activities timeline via triggers so the
-- contact/deal timeline works automatically.

-- Outcome of a held (or not held) meeting. NULL = pending (not yet registered).
CREATE TYPE public.booking_outcome AS ENUM ('held', 'no_show', 'cancelled');

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  booked_by uuid NOT NULL,
  held_at timestamptz NOT NULL,
  outcome public.booking_outcome,
  -- 1–5, set when registering the outcome (feeds 3c booking quality scoring)
  quality_score smallint CHECK (quality_score BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_workspace ON public.bookings (workspace_id);
CREATE INDEX idx_bookings_held_at ON public.bookings (workspace_id, held_at);
CREATE INDEX idx_bookings_pending ON public.bookings (workspace_id, held_at) WHERE outcome IS NULL;
CREATE INDEX idx_bookings_contact ON public.bookings (contact_id);
CREATE INDEX idx_bookings_deal ON public.bookings (deal_id);
CREATE INDEX idx_bookings_booked_by ON public.bookings (workspace_id, booked_by);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members insert bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND booked_by = auth.uid());

CREATE POLICY "Booker or admins update bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      booked_by = auth.uid()
      OR public.has_workspace_role(workspace_id, auth.uid(), 'owner')
      OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
    )
  )
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Booker or admins delete bookings"
  ON public.bookings FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      booked_by = auth.uid()
      OR public.has_workspace_role(workspace_id, auth.uid(), 'owner')
      OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
    )
  );

CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Timeline integration: bookings are specialisations of the shared activities
-- timeline. Log "meeting booked" on insert and the outcome when registered,
-- regardless of which client path performed the write.
CREATE OR REPLACE FUNCTION public.log_booking_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activities (workspace_id, type, subject, body, contact_id, deal_id, user_id)
  VALUES (
    NEW.workspace_id,
    'meeting',
    'Meeting booked',
    'Booked for ' || to_char(NEW.held_at AT TIME ZONE 'UTC', 'DD Mon YYYY, HH24:MI') || ' UTC'
      || COALESCE(' — ' || NULLIF(NEW.notes, ''), ''),
    NEW.contact_id,
    NEW.deal_id,
    NEW.booked_by
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_booking_outcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.outcome IS NOT NULL AND NEW.outcome IS DISTINCT FROM OLD.outcome THEN
    INSERT INTO public.activities (workspace_id, type, subject, body, contact_id, deal_id, user_id)
    VALUES (
      NEW.workspace_id,
      'meeting',
      CASE NEW.outcome
        WHEN 'held' THEN 'Meeting held'
        WHEN 'no_show' THEN 'Meeting no-show'
        WHEN 'cancelled' THEN 'Meeting cancelled'
      END,
      CASE
        WHEN NEW.outcome = 'held' AND NEW.quality_score IS NOT NULL
          THEN 'Quality score: ' || NEW.quality_score || '/5'
        ELSE NULL
      END,
      NEW.contact_id,
      NEW.deal_id,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_log_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_created();

CREATE TRIGGER trg_bookings_log_outcome
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_outcome();
