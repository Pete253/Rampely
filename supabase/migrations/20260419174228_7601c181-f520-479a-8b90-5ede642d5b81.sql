CREATE OR REPLACE FUNCTION public.rpt_global_recents(_workspace_id uuid, _limit integer DEFAULT 5)
RETURNS TABLE(id uuid, type text, label text, secondary text, updated_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH unioned AS (
    SELECT c.id, 'company'::text AS type, c.name AS label,
           c.industry AS secondary, c.updated_at
    FROM companies c WHERE c.workspace_id = _workspace_id

    UNION ALL
    SELECT ct.id, 'contact'::text,
           TRIM(BOTH ' ' FROM (ct.first_name || ' ' || COALESCE(ct.last_name, ''))),
           ct.email, ct.updated_at
    FROM contacts ct WHERE ct.workspace_id = _workspace_id

    UNION ALL
    SELECT d.id, 'deal'::text, d.title,
           d.status::text, d.updated_at
    FROM deals d WHERE d.workspace_id = _workspace_id

    UNION ALL
    SELECT t.id, 'task'::text, t.title,
           t.status::text, t.updated_at
    FROM tasks t WHERE t.workspace_id = _workspace_id

    UNION ALL
    SELECT e.id, 'event'::text, e.title,
           e.location, e.updated_at
    FROM calendar_events e WHERE e.workspace_id = _workspace_id

    UNION ALL
    SELECT a.id, 'activity'::text,
           COALESCE(a.subject, a.type::text),
           a.type::text, a.created_at
    FROM activities a WHERE a.workspace_id = _workspace_id
  )
  SELECT u.id, u.type, u.label, u.secondary, u.updated_at
  FROM unioned u
  ORDER BY u.updated_at DESC NULLS LAST
  LIMIT GREATEST(_limit, 1);
END;
$$;