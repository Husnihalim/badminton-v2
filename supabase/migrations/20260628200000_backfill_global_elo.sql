-- Backfill global Elo for all existing completed matches
-- Processes matches chronologically to ensure correct Elo accumulation
DO $$
DECLARE
  r_match RECORD;
  v_processed INTEGER := 0;
  v_skipped INTEGER := 0;
  v_error INTEGER := 0;
BEGIN
  FOR r_match IN (
    SELECT DISTINCT m.id, m.created_at
    FROM matches m
    JOIN score_sets ss ON ss.match_id = m.id
    JOIN match_participants mp ON mp.match_id = m.id AND mp.is_guest = false AND mp.user_id IS NOT NULL
    WHERE m.elo_processed = false
    GROUP BY m.id, m.created_at
    HAVING COUNT(CASE WHEN ss.team1_score > ss.team2_score THEN 1 END)
        <> COUNT(CASE WHEN ss.team2_score > ss.team1_score THEN 1 END)
    ORDER BY m.created_at ASC
  ) LOOP
    BEGIN
      PERFORM public.recalculate_match_elo(r_match.id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing match %: %', r_match.id, SQLERRM;
      v_error := v_error + 1;
    END;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % processed, % skipped, % errors', v_processed, v_skipped, v_error;
END;
$$;
