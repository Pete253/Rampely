-- Compensation models (Phase 3a — Earnings intelligence).
-- Datamodel contract (master build prompt §3): workspace_id, user_id?,
-- base_salary, per_booking_rate, bonus_tiers jsonb, valid_from.
-- user_id NULL = the workspace default model; a user-specific row overrides it.
-- Rows are versioned by valid_from (append a new row to change terms from a
-- date); the effective model is the latest valid_from <= today.

CREATE TABLE public.comp_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  -- Monthly base salary in the workspace currency.
  base_salary numeric NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  -- Commission per qualifying booking (held, in the month).
  per_booking_rate numeric NOT NULL DEFAULT 0 CHECK (per_booking_rate >= 0),
  -- Monthly bonus tiers: [{"threshold": 20, "bonus": 2500}, ...]
  -- threshold = qualifying bookings in the month; highest reached tier pays.
  bonus_tiers jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(bonus_tiers) = 'array'),
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One model version per user (or default) per start date.
  UNIQUE NULLS NOT DISTINCT (workspace_id, user_id, valid_from)
);

CREATE INDEX idx_comp_models_workspace ON public.comp_models (workspace_id);
CREATE INDEX idx_comp_models_user ON public.comp_models (workspace_id, user_id, valid_from DESC);

ALTER TABLE public.comp_models ENABLE ROW LEVEL SECURITY;

-- Compensation is sensitive: members may only see their own model and the
-- workspace default; owners/admins see and manage everything.
CREATE POLICY "Own or default comp models readable"
  ON public.comp_models FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (
      user_id = auth.uid()
      OR user_id IS NULL
      OR public.has_workspace_role(workspace_id, auth.uid(), 'owner')
      OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
    )
  );

CREATE POLICY "Admins insert comp models"
  ON public.comp_models FOR INSERT TO authenticated
  WITH CHECK (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
  );

CREATE POLICY "Admins update comp models"
  ON public.comp_models FOR UPDATE TO authenticated
  USING (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete comp models"
  ON public.comp_models FOR DELETE TO authenticated
  USING (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner')
    OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
  );

CREATE TRIGGER trg_comp_models_updated
  BEFORE UPDATE ON public.comp_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
