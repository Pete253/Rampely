-- Call intelligence (Phase 2b — Transcription + AI Call Scoring).
-- Four-layer architecture with explicit cost gates (master build prompt §5/2b):
--   Layer 1 (free, all calls): metadata on the calls row (duration, ring time,
--           outcome) — no AI, no call_scores row needed.
--   Layer 2 (selective): Whisper transcription, only calls > 2 min whose
--           outcome/status is not a no-answer. Output lands on calls.transcript
--           (readable) + calls.transcript_json (structured turns).
--   Layer 3 (batch, Claude Haiku): 10-parameter scoring stored in call_scores
--           with layer = 3.
--   Layer 4 (user-initiated): deep analysis with a larger model, layer = 4.
-- Unit-economics gate: every scored call logs its AI cost (cost_dkk); when the
-- workspace's average cost per scored call in the current month exceeds
-- workspaces.ai_cost_cap_dkk the pipeline falls back to Layer 1.

-- Layer 2 state machine + structured transcript + ring-time support.
ALTER TABLE public.calls
  ADD COLUMN transcript_json jsonb,
  ADD COLUMN transcript_status text NOT NULL DEFAULT 'none'
    CHECK (transcript_status IN ('none', 'pending', 'processing', 'done', 'failed', 'skipped')),
  -- Set by the status webhook when Twilio reports in-progress; ring time =
  -- answered_at - created_at (Layer 1 metadata).
  ADD COLUMN answered_at timestamptz;

-- Configurable unit-economics cap, in DKK per scored call (default 1 DKK).
ALTER TABLE public.workspaces
  ADD COLUMN ai_cost_cap_dkk numeric(6, 2) NOT NULL DEFAULT 1.00;

CREATE TABLE public.call_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  -- The rep on the call (copied from calls.user_id so RLS doesn't need a join).
  user_id uuid NOT NULL,
  layer smallint NOT NULL CHECK (layer BETWEEN 1 AND 4),
  -- Layer 3: { scores: { <param>: { score 1–5, suggestion } × 10 }, metrics: {…} }
  -- Layer 4: { strengths: [], focus_areas: [], moments: [] }
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  -- AI cost for producing this row (Whisper + model), converted to DKK.
  cost_dkk numeric(8, 4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Re-running a layer replaces its row — keeps the pipeline idempotent.
  UNIQUE (call_id, layer)
);

CREATE INDEX idx_call_scores_workspace ON public.call_scores (workspace_id, created_at DESC);
CREATE INDEX idx_call_scores_call ON public.call_scores (call_id);

ALTER TABLE public.call_scores ENABLE ROW LEVEL SECURITY;

-- Reps see their own scores; owners/admins see the whole team (Phase 4 manager
-- analytics builds on this). Writes happen only via the call-intelligence edge
-- function using the service role, so no insert/update/delete policies exist.
CREATE POLICY "Own scores or admins read"
  ON public.call_scores FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      user_id = auth.uid()
      OR public.has_workspace_role(workspace_id, auth.uid(), 'owner')
      OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
    )
  );
