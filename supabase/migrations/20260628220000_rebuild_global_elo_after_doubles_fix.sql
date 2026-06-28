-- Rebuild global Elo after the doubles partner-share function fix.
-- The earlier backfill ran before 20260628210000 fixed doubles_partner_shares()
-- calls, so old doubles matches could be skipped. This migration provides a
-- reusable full rebuild path and runs it once after the fixed functions exist.

CREATE OR REPLACE FUNCTION public.rebuild_global_elo()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r_match RECORD;
  v_processed INTEGER := 0;
  v_skipped INTEGER := 0;
  v_error INTEGER := 0;
BEGIN
  UPDATE public.profiles
  SET
    singles_elo = 1200,
    doubles_elo = 1200,
    singles_games = 0,
    doubles_games = 0;

  DELETE FROM public.elo_history_global;

  UPDATE public.matches
  SET elo_processed = false;

  FOR r_match IN (
    SELECT m.id
    FROM public.matches m
    JOIN (
      SELECT
        ss.match_id,
        COUNT(CASE WHEN ss.team1_score > ss.team2_score THEN 1 END) AS team1_sets,
        COUNT(CASE WHEN ss.team2_score > ss.team1_score THEN 1 END) AS team2_sets
      FROM public.score_sets ss
      GROUP BY ss.match_id
    ) ms ON ms.match_id = m.id
    WHERE ms.team1_sets <> ms.team2_sets
      AND EXISTS (
        SELECT 1
        FROM public.match_participants mp
        WHERE mp.match_id = m.id
          AND mp.team = 1
          AND mp.is_guest = false
          AND mp.user_id IS NOT NULL
      )
      AND EXISTS (
        SELECT 1
        FROM public.match_participants mp
        WHERE mp.match_id = m.id
          AND mp.team = 2
          AND mp.is_guest = false
          AND mp.user_id IS NOT NULL
      )
    ORDER BY m.match_date ASC NULLS LAST, m.created_at ASC, m.id ASC
  ) LOOP
    BEGIN
      PERFORM public.recalculate_match_elo(r_match.id);

      IF EXISTS (
        SELECT 1
        FROM public.matches
        WHERE id = r_match.id
          AND elo_processed = true
      ) THEN
        v_processed := v_processed + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Global Elo rebuild failed for match %: %', r_match.id, SQLERRM;
      v_error := v_error + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'skipped', v_skipped,
    'errors', v_error
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_global_elo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rebuild_global_elo() FROM anon;
REVOKE ALL ON FUNCTION public.rebuild_global_elo() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_global_elo() TO service_role;

CREATE OR REPLACE FUNCTION public.rebuild_global_elo_after_match_update(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_update BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = p_match_id
      AND (
        m.recorded_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.memberships mem
          WHERE mem.club_id = m.club_id
            AND mem.user_id = auth.uid()
            AND mem.status = 'active'
            AND mem.role IN ('owner', 'admin')
        )
      )
  ) INTO v_can_update;

  IF NOT COALESCE(v_can_update, false) THEN
    RAISE EXCEPTION 'Not authorized to rebuild Elo for this match'
      USING ERRCODE = '42501';
  END IF;

  RETURN public.rebuild_global_elo();
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_global_elo_after_match_update(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rebuild_global_elo_after_match_update(UUID) TO authenticated;

DO $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT public.rebuild_global_elo() INTO v_result;
  RAISE NOTICE 'Global Elo rebuild result: %', v_result;
END;
$$;
