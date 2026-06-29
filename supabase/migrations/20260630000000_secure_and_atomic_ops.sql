-- Revoke execution privileges on ELO recalculation from non-admin roles
REVOKE EXECUTE ON FUNCTION public.recalculate_match_elo(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_match_elo(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_match_elo(UUID) FROM authenticated;

-- Create atomic transaction function for competition match recording
CREATE OR REPLACE FUNCTION public.record_competition_match(
  p_matchup_id UUID,
  p_club_id UUID,
  p_sport TEXT,
  p_match_type TEXT,
  p_date DATE,
  p_competition_id UUID,
  p_participants JSONB,
  p_score_sets JSONB
)
RETURNS matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_match matches;
  v_participant JSONB;
  v_score_set JSONB;
  v_team1_wins INTEGER := 0;
  v_team2_wins INTEGER := 0;
  v_winning_team INTEGER;
  v_matchup RECORD;
  v_winner_participant_id UUID;
  v_winner_club_id UUID;
  v_is_active BOOLEAN;
BEGIN
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to record a match'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Authorization check: must be active member of a participating club in the competition
  SELECT EXISTS (
    SELECT 1
    FROM public.competition_clubs cc
    JOIN public.memberships m ON m.club_id = cc.club_id
    WHERE cc.competition_id = p_competition_id
      AND m.user_id = v_current_user_id
      AND m.status = 'active'
      AND cc.status = 'confirmed'
  ) INTO v_is_active;

  IF NOT COALESCE(v_is_active, false) THEN
    RAISE EXCEPTION 'Must be an active member of a participating club to record a competition match'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Insert match record
  INSERT INTO matches (
    club_id,
    title,
    sport,
    match_type,
    recorded_by,
    match_date,
    tournament_id,
    elo_processed
  ) VALUES (
    p_club_id,
    'Competition match',
    p_sport,
    p_match_type,
    v_current_user_id,
    COALESCE(p_date, CURRENT_DATE),
    p_competition_id,
    false -- Let trigger process ELO automatically at commit time
  )
  RETURNING * INTO v_match;

  -- 3. Insert participants
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    INSERT INTO match_participants (match_id, user_id, team, is_guest, guest_name)
    VALUES (
      v_match.id,
      (v_participant->>'user_id')::uuid,
      (v_participant->>'team')::integer,
      false,
      NULL
    );
  END LOOP;

  -- 4. Insert score sets and compute sets won by each team
  FOR v_score_set IN SELECT * FROM jsonb_array_elements(p_score_sets)
  LOOP
    INSERT INTO score_sets (match_id, set_number, team1_score, team2_score)
    VALUES (
      v_match.id,
      (v_score_set->>'set_number')::integer,
      (v_score_set->>'team1_score')::integer,
      (v_score_set->>'team2_score')::integer
    );
    
    IF (v_score_set->>'team1_score')::integer = (v_score_set->>'team2_score')::integer THEN
      RAISE EXCEPTION 'A set score cannot be a tie.'
        USING ERRCODE = '22023';
    END IF;

    IF (v_score_set->>'team1_score')::integer > (v_score_set->>'team2_score')::integer THEN
      v_team1_wins := v_team1_wins + 1;
    ELSE
      v_team2_wins := v_team2_wins + 1;
    END IF;
  END LOOP;

  IF v_team1_wins = v_team2_wins THEN
    RAISE EXCEPTION 'A competition match needs a winner.'
      USING ERRCODE = '22023';
  END IF;
  v_winning_team := CASE WHEN v_team1_wins > v_team2_wins THEN 1 ELSE 2 END;

  -- 5. Fetch matchup details
  SELECT participant_a_id, participant_b_id, club_a_id, club_b_id
  INTO v_matchup
  FROM competition_matchups
  WHERE id = p_matchup_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Matchup not found.'
      USING ERRCODE = '42704';
  END IF;

  v_winner_participant_id := CASE WHEN v_winning_team = 1 THEN v_matchup.participant_a_id ELSE v_matchup.participant_b_id END;
  v_winner_club_id := CASE WHEN v_winning_team = 1 THEN v_matchup.club_a_id ELSE v_matchup.club_b_id END;

  -- 6. Update matchup record
  UPDATE competition_matchups
  SET
    match_id = v_match.id,
    status = 'completed',
    winner_participant_id = v_winner_participant_id,
    winner_club_id = v_winner_club_id
  WHERE id = p_matchup_id;

  RETURN v_match;
END;
$$;

-- Grant execution privileges on the atomic transaction function
REVOKE ALL ON FUNCTION public.record_competition_match(UUID, UUID, TEXT, TEXT, DATE, UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_competition_match(UUID, UUID, TEXT, TEXT, DATE, UUID, JSONB, JSONB) TO authenticated;
