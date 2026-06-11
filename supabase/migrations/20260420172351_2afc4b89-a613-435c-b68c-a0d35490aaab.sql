ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY workspace_id ORDER BY created_at DESC) - 1 AS rn
  FROM public.tasks
)
UPDATE public.tasks t SET sort_order = ranked.rn FROM ranked WHERE t.id = ranked.id;

CREATE INDEX IF NOT EXISTS tasks_workspace_sort_idx ON public.tasks (workspace_id, sort_order);