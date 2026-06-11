-- New enum for stage type
DO $$ BEGIN
  CREATE TYPE public.stage_type AS ENUM ('open', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add stage_type to pipeline_stages
ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS stage_type public.stage_type NOT NULL DEFAULT 'open';

-- Add sort_order and description to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS deals_pipeline_stage_sort_idx
  ON public.deals (pipeline_id, stage_id, sort_order);

CREATE INDEX IF NOT EXISTS pipeline_stages_pipeline_sort_idx
  ON public.pipeline_stages (pipeline_id, sort_order);