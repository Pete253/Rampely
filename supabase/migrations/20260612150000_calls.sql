-- Calls (Phase 2a — Power Dialer).
-- Datamodel contract (master build prompt §3): activity_id, recording_url?,
-- transcript?, duration, direction. Calls are specialisations of the shared
-- activities timeline: a BEFORE INSERT trigger creates the activity row and
-- links it, so the contact/deal timeline works for every capture source
-- (Twilio softphone now, Rampely Audio later via the `source` column).

CREATE TYPE public.call_direction AS ENUM ('outbound', 'inbound');

CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  direction public.call_direction NOT NULL DEFAULT 'outbound',
  -- Twilio lifecycle status: initiated → ringing → in-progress → completed
  -- (or busy / failed / no-answer / canceled).
  status text NOT NULL DEFAULT 'initiated',
  from_number text,
  to_number text NOT NULL,
  twilio_call_sid text UNIQUE,
  -- Seconds; written by the status webhook (client fallback on disconnect).
  duration integer,
  -- Rep-registered outcome: Connected / Voicemail / No Answer / Callback Scheduled.
  outcome text,
  recording_url text,
  -- Filled by Phase 2b transcription; present per the datamodel contract.
  transcript text,
  -- Capture source: 'twilio' (softphone) or 'rampely_audio' (native capture, later).
  source text NOT NULL DEFAULT 'twilio',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_workspace ON public.calls (workspace_id, created_at DESC);
CREATE INDEX idx_calls_contact ON public.calls (contact_id);
CREATE INDEX idx_calls_deal ON public.calls (deal_id);
CREATE INDEX idx_calls_user ON public.calls (workspace_id, user_id);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read calls"
  ON public.calls FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members insert own calls"
  ON public.calls FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Caller or admins update calls"
  ON public.calls FOR UPDATE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      user_id = auth.uid()
      OR public.has_workspace_role(workspace_id, auth.uid(), 'owner')
      OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
    )
  )
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Caller or admins delete calls"
  ON public.calls FOR DELETE TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      user_id = auth.uid()
      OR public.has_workspace_role(workspace_id, auth.uid(), 'owner')
      OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
    )
  );

CREATE TRIGGER trg_calls_updated
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Timeline integration: create the linked activity when a call starts.
CREATE OR REPLACE FUNCTION public.log_call_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _activity_id uuid;
BEGIN
  INSERT INTO public.activities (workspace_id, type, subject, body, contact_id, deal_id, user_id)
  VALUES (
    NEW.workspace_id,
    'call',
    CASE NEW.direction WHEN 'inbound' THEN 'Inbound call' ELSE 'Outbound call' END,
    'Calling ' || NEW.to_number || '…',
    NEW.contact_id,
    NEW.deal_id,
    NEW.user_id
  )
  RETURNING id INTO _activity_id;
  NEW.activity_id := _activity_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calls_log_created
  BEFORE INSERT ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.log_call_created();

-- Keep the linked activity readable as the call progresses: reflect final
-- status, duration and the rep's outcome in the activity body.
CREATE OR REPLACE FUNCTION public.sync_call_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _body text;
BEGIN
  IF NEW.activity_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.duration IS NOT DISTINCT FROM OLD.duration
     AND NEW.outcome IS NOT DISTINCT FROM OLD.outcome
     AND NEW.notes IS NOT DISTINCT FROM OLD.notes THEN
    RETURN NEW;
  END IF;

  _body := NEW.to_number;
  IF NEW.duration IS NOT NULL THEN
    _body := _body || ' · ' || (NEW.duration / 60) || 'm ' || (NEW.duration % 60) || 's';
  END IF;
  IF NEW.outcome IS NOT NULL THEN
    _body := _body || ' · ' || NEW.outcome;
  ELSIF NEW.status NOT IN ('initiated', 'ringing', 'in-progress') THEN
    _body := _body || ' · ' || NEW.status;
  END IF;
  IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
    _body := _body || E'\n' || NEW.notes;
  END IF;

  UPDATE public.activities SET body = _body WHERE id = NEW.activity_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calls_sync_activity
  AFTER UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.sync_call_activity();
