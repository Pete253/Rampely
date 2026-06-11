-- 1. KPI summary (current + previous period)
CREATE OR REPLACE FUNCTION public.rpt_kpi_summary(
  _workspace_id uuid,
  _from timestamptz,
  _to timestamptz,
  _prev_from timestamptz,
  _prev_to timestamptz
)
RETURNS TABLE (
  total_pipeline_value numeric,
  weighted_pipeline_value numeric,
  deals_won_count bigint,
  deals_won_value numeric,
  activities_count bigint,
  total_pipeline_value_prev numeric,
  weighted_pipeline_value_prev numeric,
  deals_won_count_prev bigint,
  deals_won_value_prev numeric,
  activities_count_prev bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(d.value) FROM deals d
              WHERE d.workspace_id = _workspace_id AND d.status = 'open'), 0)::numeric,
    COALESCE((SELECT SUM(d.value * s.probability / 100.0)
              FROM deals d
              JOIN pipeline_stages s ON s.id = d.stage_id
              WHERE d.workspace_id = _workspace_id AND d.status = 'open'), 0)::numeric,
    COALESCE((SELECT COUNT(*) FROM deals d
              WHERE d.workspace_id = _workspace_id AND d.status = 'won'
                AND d.updated_at >= _from AND d.updated_at < _to), 0)::bigint,
    COALESCE((SELECT SUM(d.value) FROM deals d
              WHERE d.workspace_id = _workspace_id AND d.status = 'won'
                AND d.updated_at >= _from AND d.updated_at < _to), 0)::numeric,
    COALESCE((SELECT COUNT(*) FROM activities a
              WHERE a.workspace_id = _workspace_id
                AND a.created_at >= _from AND a.created_at < _to), 0)::bigint,
    -- previous-period values: pipeline totals re-evaluated with same logic (snapshot)
    COALESCE((SELECT SUM(d.value) FROM deals d
              WHERE d.workspace_id = _workspace_id AND d.status = 'open'
                AND d.created_at < _from), 0)::numeric,
    COALESCE((SELECT SUM(d.value * s.probability / 100.0)
              FROM deals d
              JOIN pipeline_stages s ON s.id = d.stage_id
              WHERE d.workspace_id = _workspace_id AND d.status = 'open'
                AND d.created_at < _from), 0)::numeric,
    COALESCE((SELECT COUNT(*) FROM deals d
              WHERE d.workspace_id = _workspace_id AND d.status = 'won'
                AND d.updated_at >= _prev_from AND d.updated_at < _prev_to), 0)::bigint,
    COALESCE((SELECT SUM(d.value) FROM deals d
              WHERE d.workspace_id = _workspace_id AND d.status = 'won'
                AND d.updated_at >= _prev_from AND d.updated_at < _prev_to), 0)::numeric,
    COALESCE((SELECT COUNT(*) FROM activities a
              WHERE a.workspace_id = _workspace_id
                AND a.created_at >= _prev_from AND a.created_at < _prev_to), 0)::bigint;
END;
$$;

-- 2. KPI sparklines: daily series for each metric
CREATE OR REPLACE FUNCTION public.rpt_kpi_sparklines(
  _workspace_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  day date,
  pipeline_value numeric,
  weighted_value numeric,
  deals_won bigint,
  activities bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(date_trunc('day', _from)::date,
                           date_trunc('day', _to - interval '1 day')::date,
                           interval '1 day')::date AS day
  ),
  open_deals AS (
    SELECT date_trunc('day', d.created_at)::date AS day,
           SUM(d.value) AS v,
           SUM(d.value * s.probability / 100.0) AS w
    FROM deals d
    JOIN pipeline_stages s ON s.id = d.stage_id
    WHERE d.workspace_id = _workspace_id
      AND d.created_at >= _from AND d.created_at < _to
    GROUP BY 1
  ),
  won AS (
    SELECT date_trunc('day', d.updated_at)::date AS day, COUNT(*) AS c
    FROM deals d
    WHERE d.workspace_id = _workspace_id AND d.status = 'won'
      AND d.updated_at >= _from AND d.updated_at < _to
    GROUP BY 1
  ),
  acts AS (
    SELECT date_trunc('day', a.created_at)::date AS day, COUNT(*) AS c
    FROM activities a
    WHERE a.workspace_id = _workspace_id
      AND a.created_at >= _from AND a.created_at < _to
    GROUP BY 1
  )
  SELECT d.day,
         COALESCE(o.v, 0)::numeric,
         COALESCE(o.w, 0)::numeric,
         COALESCE(w.c, 0)::bigint,
         COALESCE(a.c, 0)::bigint
  FROM days d
  LEFT JOIN open_deals o ON o.day = d.day
  LEFT JOIN won w ON w.day = d.day
  LEFT JOIN acts a ON a.day = d.day
  ORDER BY d.day;
END;
$$;

-- 3. Pipeline by stage
CREATE OR REPLACE FUNCTION public.rpt_pipeline_by_stage(
  _workspace_id uuid,
  _pipeline_id uuid DEFAULT NULL
)
RETURNS TABLE (
  stage_id uuid,
  stage_name text,
  color text,
  sort_order int,
  total_value numeric,
  deal_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pid uuid;
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  IF _pipeline_id IS NULL THEN
    SELECT p.id INTO _pid FROM pipelines p
     WHERE p.workspace_id = _workspace_id
     ORDER BY p.is_default DESC, p.created_at ASC LIMIT 1;
  ELSE
    _pid := _pipeline_id;
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, s.color, s.sort_order,
         COALESCE(SUM(d.value) FILTER (WHERE d.status = 'open'), 0)::numeric,
         COALESCE(COUNT(d.id) FILTER (WHERE d.status = 'open'), 0)::bigint
  FROM pipeline_stages s
  LEFT JOIN deals d ON d.stage_id = s.id AND d.workspace_id = _workspace_id
  WHERE s.pipeline_id = _pid
  GROUP BY s.id, s.name, s.color, s.sort_order
  ORDER BY s.sort_order;
END;
$$;

-- 4. Deal velocity by week + status
CREATE OR REPLACE FUNCTION public.rpt_deal_velocity(
  _workspace_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  week_start date,
  status deal_status,
  deals_count bigint,
  avg_days numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT date_trunc('week', d.updated_at)::date,
         d.status,
         COUNT(*)::bigint,
         AVG(EXTRACT(EPOCH FROM (d.updated_at - d.created_at)) / 86400.0)::numeric
  FROM deals d
  WHERE d.workspace_id = _workspace_id
    AND d.status IN ('won', 'lost')
    AND d.updated_at >= _from AND d.updated_at < _to
  GROUP BY 1, 2
  ORDER BY 1, 2;
END;
$$;

-- 5. Activity breakdown
CREATE OR REPLACE FUNCTION public.rpt_activity_breakdown(
  _workspace_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  type activity_type,
  count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT a.type, COUNT(*)::bigint
  FROM activities a
  WHERE a.workspace_id = _workspace_id
    AND a.created_at >= _from AND a.created_at < _to
  GROUP BY a.type
  ORDER BY a.type;
END;
$$;

-- 6. Deals created vs closed (weekly)
CREATE OR REPLACE FUNCTION public.rpt_deals_created_vs_closed(
  _workspace_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  week_start date,
  created_count bigint,
  won_count bigint,
  lost_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH weeks AS (
    SELECT generate_series(date_trunc('week', _from),
                           date_trunc('week', _to - interval '1 day'),
                           interval '1 week')::date AS week_start
  ),
  created AS (
    SELECT date_trunc('week', d.created_at)::date AS w, COUNT(*) AS c
    FROM deals d
    WHERE d.workspace_id = _workspace_id
      AND d.created_at >= _from AND d.created_at < _to
    GROUP BY 1
  ),
  won AS (
    SELECT date_trunc('week', d.updated_at)::date AS w, COUNT(*) AS c
    FROM deals d
    WHERE d.workspace_id = _workspace_id AND d.status = 'won'
      AND d.updated_at >= _from AND d.updated_at < _to
    GROUP BY 1
  ),
  lost AS (
    SELECT date_trunc('week', d.updated_at)::date AS w, COUNT(*) AS c
    FROM deals d
    WHERE d.workspace_id = _workspace_id AND d.status = 'lost'
      AND d.updated_at >= _from AND d.updated_at < _to
    GROUP BY 1
  )
  SELECT wk.week_start,
         COALESCE(cr.c, 0)::bigint,
         COALESCE(wn.c, 0)::bigint,
         COALESCE(ls.c, 0)::bigint
  FROM weeks wk
  LEFT JOIN created cr ON cr.w = wk.week_start
  LEFT JOIN won wn ON wn.w = wk.week_start
  LEFT JOIN lost ls ON ls.w = wk.week_start
  ORDER BY wk.week_start;
END;
$$;

-- 7. Team leaderboard
CREATE OR REPLACE FUNCTION public.rpt_team_leaderboard(
  _workspace_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  deals_won bigint,
  won_value numeric,
  calls_logged bigint,
  meetings_booked bigint,
  tasks_completed bigint,
  activity_score numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT wm.user_id FROM workspace_members wm WHERE wm.workspace_id = _workspace_id
  ),
  d_won AS (
    SELECT d.owner_id AS uid, COUNT(*) AS c, COALESCE(SUM(d.value), 0) AS v
    FROM deals d
    WHERE d.workspace_id = _workspace_id AND d.status = 'won'
      AND d.updated_at >= _from AND d.updated_at < _to
      AND d.owner_id IS NOT NULL
    GROUP BY d.owner_id
  ),
  calls AS (
    SELECT a.user_id AS uid, COUNT(*) AS c
    FROM activities a
    WHERE a.workspace_id = _workspace_id AND a.type = 'call'
      AND a.created_at >= _from AND a.created_at < _to
      AND a.user_id IS NOT NULL
    GROUP BY a.user_id
  ),
  meetings AS (
    SELECT e.owner_id AS uid, COUNT(*) AS c
    FROM calendar_events e
    WHERE e.workspace_id = _workspace_id AND e.event_type = 'meeting'
      AND e.start_at >= _from AND e.start_at < _to
    GROUP BY e.owner_id
  ),
  tasks_done AS (
    SELECT t.assignee_id AS uid, COUNT(*) AS c
    FROM tasks t
    WHERE t.workspace_id = _workspace_id AND t.status = 'done'
      AND t.completed_at IS NOT NULL
      AND t.completed_at >= _from AND t.completed_at < _to
    GROUP BY t.assignee_id
  )
  SELECT
    m.user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(dw.c, 0)::bigint,
    COALESCE(dw.v, 0)::numeric,
    COALESCE(ca.c, 0)::bigint,
    COALESCE(me.c, 0)::bigint,
    COALESCE(td.c, 0)::bigint,
    (COALESCE(dw.c, 0) * 10
      + COALESCE(dw.v, 0) / 10000.0
      + COALESCE(ca.c, 0) * 2
      + COALESCE(me.c, 0) * 3
      + COALESCE(td.c, 0) * 1
    )::numeric
  FROM members m
  LEFT JOIN profiles p ON p.id = m.user_id
  LEFT JOIN d_won dw ON dw.uid = m.user_id
  LEFT JOIN calls ca ON ca.uid = m.user_id
  LEFT JOIN meetings me ON me.uid = m.user_id
  LEFT JOIN tasks_done td ON td.uid = m.user_id
  ORDER BY 9 DESC;
END;
$$;