-- Fix doubles_partner_shares calls - OUT params must not be passed as arguments

-- ============================================
-- 1. Recreate process_match_elo with correct calls
-- ============================================
CREATE OR REPLACE FUNCTION public.process_match_elo()
RETURNS TRIGGER AS $$
DECLARE
  v_match_type TEXT;
  v_participant RECORD;
  v_team1_rating NUMERIC := 0;
  v_team2_rating NUMERIC := 0;
  v_team1_count INTEGER := 0;
  v_team2_count INTEGER := 0;
  v_team1_user_ids UUID[] := '{}';
  v_team2_user_ids UUID[] := '{}';
  v_team1_ratings INTEGER[] := '{}';
  v_team2_ratings INTEGER[] := '{}';
  v_team1_sets INTEGER := 0;
  v_team2_sets INTEGER := 0;
  v_team1_outcome INTEGER;
  v_total_delta INTEGER;
  v_player_rating INTEGER;
  v_player_games INTEGER;
  v_k INTEGER;
  v_i INTEGER;
  v_share1 INTEGER;
  v_share2 INTEGER;
  v_partner_rating INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT match_type INTO v_match_type FROM matches WHERE id = NEW.match_id;
  IF v_match_type IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM matches WHERE id = NEW.match_id AND elo_processed = true) THEN
    RETURN NEW;
  END IF;

  FOR v_participant IN (
    SELECT mp.user_id, mp.team,
      CASE WHEN v_match_type = 'singles' THEN p.singles_elo ELSE p.doubles_elo END AS rating,
      CASE WHEN v_match_type = 'singles' THEN p.singles_games ELSE p.doubles_games END AS games
    FROM match_participants mp
    JOIN profiles p ON p.id = mp.user_id
    WHERE mp.match_id = NEW.match_id AND mp.is_guest = false AND mp.user_id IS NOT NULL
  ) LOOP
    IF v_participant.team = 1 THEN
      v_team1_count := v_team1_count + 1;
      v_team1_rating := v_team1_rating + v_participant.rating;
      v_team1_user_ids := array_append(v_team1_user_ids, v_participant.user_id);
      v_team1_ratings := array_append(v_team1_ratings, v_participant.rating);
    ELSE
      v_team2_count := v_team2_count + 1;
      v_team2_rating := v_team2_rating + v_participant.rating;
      v_team2_user_ids := array_append(v_team2_user_ids, v_participant.user_id);
      v_team2_ratings := array_append(v_team2_ratings, v_participant.rating);
    END IF;
  END LOOP;

  IF v_team1_count = 0 OR v_team2_count = 0 THEN
    RETURN NEW;
  END IF;

  v_team1_rating := v_team1_rating / v_team1_count;
  v_team2_rating := v_team2_rating / v_team2_count;

  SELECT
    COUNT(CASE WHEN team1_score > team2_score THEN 1 END),
    COUNT(CASE WHEN team2_score > team1_score THEN 1 END)
  INTO v_team1_sets, v_team2_sets
  FROM score_sets
  WHERE match_id = NEW.match_id;

  IF v_team1_sets = v_team2_sets THEN
    RETURN NEW;
  END IF;

  v_team1_outcome := CASE WHEN v_team1_sets > v_team2_sets THEN 1 ELSE 0 END;
  UPDATE matches SET elo_processed = true WHERE id = NEW.match_id;

  FOR v_i IN 1 .. array_length(v_team1_user_ids, 1) LOOP
    IF v_match_type = 'doubles' THEN
      SELECT doubles_elo, doubles_games INTO v_player_rating, v_player_games
      FROM profiles WHERE id = v_team1_user_ids[v_i];
    ELSE
      SELECT singles_elo, singles_games INTO v_player_rating, v_player_games
      FROM profiles WHERE id = v_team1_user_ids[v_i];
    END IF;

    v_total_delta := calculate_elo_delta(v_player_rating, ROUND(v_team2_rating)::INTEGER, v_team1_outcome, v_player_games);

    IF v_match_type = 'doubles' AND array_length(v_team1_ratings, 1) > 1 THEN
      SELECT share_1, share_2 INTO v_share1, v_share2
      FROM doubles_partner_shares(v_team1_ratings[1], v_team1_ratings[2], v_total_delta);
      IF v_i = 1 THEN v_total_delta := v_share1; ELSE v_total_delta := v_share2; END IF;
    END IF;

    IF v_match_type = 'doubles' THEN
      UPDATE profiles SET doubles_elo = doubles_elo + v_total_delta, doubles_games = doubles_games + 1
      WHERE id = v_team1_user_ids[v_i];
    ELSE
      UPDATE profiles SET singles_elo = singles_elo + v_total_delta, singles_games = singles_games + 1
      WHERE id = v_team1_user_ids[v_i];
    END IF;

    IF v_player_games < 20 THEN v_k := 40;
    ELSIF v_player_games < 60 THEN v_k := 20;
    ELSE v_k := 10;
    END IF;

    IF v_match_type = 'doubles' AND array_length(v_team1_ratings, 1) > 1 THEN
      v_partner_rating := CASE WHEN v_i = 1 THEN v_team1_ratings[2] ELSE v_team1_ratings[1] END;
    ELSE
      v_partner_rating := NULL;
    END IF;

    INSERT INTO elo_history_global (profile_id, match_id, match_type, elo_before, elo_after, delta, k_factor, opponent_rating_avg, partner_rating)
    VALUES (v_team1_user_ids[v_i], NEW.match_id, v_match_type, v_player_rating, v_player_rating + v_total_delta, v_total_delta, v_k, ROUND(v_team2_rating)::INTEGER, v_partner_rating);
  END LOOP;

  FOR v_i IN 1 .. array_length(v_team2_user_ids, 1) LOOP
    IF v_match_type = 'doubles' THEN
      SELECT doubles_elo, doubles_games INTO v_player_rating, v_player_games
      FROM profiles WHERE id = v_team2_user_ids[v_i];
    ELSE
      SELECT singles_elo, singles_games INTO v_player_rating, v_player_games
      FROM profiles WHERE id = v_team2_user_ids[v_i];
    END IF;

    v_total_delta := calculate_elo_delta(v_player_rating, ROUND(v_team1_rating)::INTEGER, 1 - v_team1_outcome, v_player_games);

    IF v_match_type = 'doubles' AND array_length(v_team2_ratings, 1) > 1 THEN
      SELECT share_1, share_2 INTO v_share1, v_share2
      FROM doubles_partner_shares(v_team2_ratings[1], v_team2_ratings[2], v_total_delta);
      IF v_i = 1 THEN v_total_delta := v_share1; ELSE v_total_delta := v_share2; END IF;
    END IF;

    IF v_match_type = 'doubles' THEN
      UPDATE profiles SET doubles_elo = doubles_elo + v_total_delta, doubles_games = doubles_games + 1
      WHERE id = v_team2_user_ids[v_i];
    ELSE
      UPDATE profiles SET singles_elo = singles_elo + v_total_delta, singles_games = singles_games + 1
      WHERE id = v_team2_user_ids[v_i];
    END IF;

    IF v_player_games < 20 THEN v_k := 40;
    ELSIF v_player_games < 60 THEN v_k := 20;
    ELSE v_k := 10;
    END IF;

    IF v_match_type = 'doubles' AND array_length(v_team2_ratings, 1) > 1 THEN
      v_partner_rating := CASE WHEN v_i = 1 THEN v_team2_ratings[2] ELSE v_team2_ratings[1] END;
    ELSE
      v_partner_rating := NULL;
    END IF;

    INSERT INTO elo_history_global (profile_id, match_id, match_type, elo_before, elo_after, delta, k_factor, opponent_rating_avg, partner_rating)
    VALUES (v_team2_user_ids[v_i], NEW.match_id, v_match_type, v_player_rating, v_player_rating + v_total_delta, v_total_delta, v_k, ROUND(v_team1_rating)::INTEGER, v_partner_rating);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Recreate recalculate_match_elo with correct calls
-- ============================================
CREATE OR REPLACE FUNCTION public.recalculate_match_elo(p_match_id UUID)
RETURNS void AS $$
DECLARE
  v_match_type TEXT;
  v_participant RECORD;
  v_team1_rating NUMERIC := 0;
  v_team2_rating NUMERIC := 0;
  v_team1_count INTEGER := 0;
  v_team2_count INTEGER := 0;
  v_team1_user_ids UUID[] := '{}';
  v_team2_user_ids UUID[] := '{}';
  v_team1_ratings INTEGER[] := '{}';
  v_team2_ratings INTEGER[] := '{}';
  v_team1_sets INTEGER := 0;
  v_team2_sets INTEGER := 0;
  v_team1_outcome INTEGER;
  v_total_delta INTEGER;
  v_player_rating INTEGER;
  v_player_games INTEGER;
  v_k INTEGER;
  v_i INTEGER;
  v_share1 INTEGER;
  v_share2 INTEGER;
  v_partner_rating INTEGER;
BEGIN
  SELECT match_type INTO v_match_type FROM matches WHERE id = p_match_id;
  IF v_match_type IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM elo_history_global WHERE match_id = p_match_id;

  FOR v_participant IN (
    SELECT mp.user_id, mp.team,
      CASE WHEN v_match_type = 'singles' THEN p.singles_elo ELSE p.doubles_elo END AS rating,
      CASE WHEN v_match_type = 'singles' THEN p.singles_games ELSE p.doubles_games END AS games
    FROM match_participants mp
    JOIN profiles p ON p.id = mp.user_id
    WHERE mp.match_id = p_match_id AND mp.is_guest = false AND mp.user_id IS NOT NULL
  ) LOOP
    IF v_participant.team = 1 THEN
      v_team1_count := v_team1_count + 1;
      v_team1_rating := v_team1_rating + v_participant.rating;
      v_team1_user_ids := array_append(v_team1_user_ids, v_participant.user_id);
      v_team1_ratings := array_append(v_team1_ratings, v_participant.rating);
    ELSE
      v_team2_count := v_team2_count + 1;
      v_team2_rating := v_team2_rating + v_participant.rating;
      v_team2_user_ids := array_append(v_team2_user_ids, v_participant.user_id);
      v_team2_ratings := array_append(v_team2_ratings, v_participant.rating);
    END IF;
  END LOOP;

  IF v_team1_count = 0 OR v_team2_count = 0 THEN
    RETURN;
  END IF;

  v_team1_rating := v_team1_rating / v_team1_count;
  v_team2_rating := v_team2_rating / v_team2_count;

  SELECT
    COUNT(CASE WHEN team1_score > team2_score THEN 1 END),
    COUNT(CASE WHEN team2_score > team1_score THEN 1 END)
  INTO v_team1_sets, v_team2_sets
  FROM score_sets
  WHERE match_id = p_match_id;

  IF v_team1_sets = v_team2_sets THEN
    RETURN;
  END IF;

  v_team1_outcome := CASE WHEN v_team1_sets > v_team2_sets THEN 1 ELSE 0 END;

  FOR v_i IN 1 .. array_length(v_team1_user_ids, 1) LOOP
    IF v_match_type = 'doubles' THEN
      SELECT doubles_elo, doubles_games INTO v_player_rating, v_player_games
      FROM profiles WHERE id = v_team1_user_ids[v_i];
    ELSE
      SELECT singles_elo, singles_games INTO v_player_rating, v_player_games
      FROM profiles WHERE id = v_team1_user_ids[v_i];
    END IF;

    v_total_delta := calculate_elo_delta(v_player_rating, ROUND(v_team2_rating)::INTEGER, v_team1_outcome, v_player_games);

    IF v_match_type = 'doubles' AND array_length(v_team1_ratings, 1) > 1 THEN
      SELECT share_1, share_2 INTO v_share1, v_share2
      FROM doubles_partner_shares(v_team1_ratings[1], v_team1_ratings[2], v_total_delta);
      IF v_i = 1 THEN v_total_delta := v_share1; ELSE v_total_delta := v_share2; END IF;
    END IF;

    IF v_match_type = 'doubles' THEN
      UPDATE profiles SET doubles_elo = doubles_elo + v_total_delta, doubles_games = doubles_games + 1
      WHERE id = v_team1_user_ids[v_i];
    ELSE
      UPDATE profiles SET singles_elo = singles_elo + v_total_delta, singles_games = singles_games + 1
      WHERE id = v_team1_user_ids[v_i];
    END IF;

    IF v_player_games < 20 THEN v_k := 40;
    ELSIF v_player_games < 60 THEN v_k := 20;
    ELSE v_k := 10;
    END IF;

    IF v_match_type = 'doubles' AND array_length(v_team1_ratings, 1) > 1 THEN
      v_partner_rating := CASE WHEN v_i = 1 THEN v_team1_ratings[2] ELSE v_team1_ratings[1] END;
    ELSE
      v_partner_rating := NULL;
    END IF;

    INSERT INTO elo_history_global (profile_id, match_id, match_type, elo_before, elo_after, delta, k_factor, opponent_rating_avg, partner_rating)
    VALUES (v_team1_user_ids[v_i], p_match_id, v_match_type, v_player_rating, v_player_rating + v_total_delta, v_total_delta, v_k, ROUND(v_team2_rating)::INTEGER, v_partner_rating);
  END LOOP;

  FOR v_i IN 1 .. array_length(v_team2_user_ids, 1) LOOP
    IF v_match_type = 'doubles' THEN
      SELECT doubles_elo, doubles_games INTO v_player_rating, v_player_games
      FROM profiles WHERE id = v_team2_user_ids[v_i];
    ELSE
      SELECT singles_elo, singles_games INTO v_player_rating, v_player_games
      FROM profiles WHERE id = v_team2_user_ids[v_i];
    END IF;

    v_total_delta := calculate_elo_delta(v_player_rating, ROUND(v_team1_rating)::INTEGER, 1 - v_team1_outcome, v_player_games);

    IF v_match_type = 'doubles' AND array_length(v_team2_ratings, 1) > 1 THEN
      SELECT share_1, share_2 INTO v_share1, v_share2
      FROM doubles_partner_shares(v_team2_ratings[1], v_team2_ratings[2], v_total_delta);
      IF v_i = 1 THEN v_total_delta := v_share1; ELSE v_total_delta := v_share2; END IF;
    END IF;

    IF v_match_type = 'doubles' THEN
      UPDATE profiles SET doubles_elo = doubles_elo + v_total_delta, doubles_games = doubles_games + 1
      WHERE id = v_team2_user_ids[v_i];
    ELSE
      UPDATE profiles SET singles_elo = singles_elo + v_total_delta, singles_games = singles_games + 1
      WHERE id = v_team2_user_ids[v_i];
    END IF;

    IF v_player_games < 20 THEN v_k := 40;
    ELSIF v_player_games < 60 THEN v_k := 20;
    ELSE v_k := 10;
    END IF;

    IF v_match_type = 'doubles' AND array_length(v_team2_ratings, 1) > 1 THEN
      v_partner_rating := CASE WHEN v_i = 1 THEN v_team2_ratings[2] ELSE v_team2_ratings[1] END;
    ELSE
      v_partner_rating := NULL;
    END IF;

    INSERT INTO elo_history_global (profile_id, match_id, match_type, elo_before, elo_after, delta, k_factor, opponent_rating_avg, partner_rating)
    VALUES (v_team2_user_ids[v_i], p_match_id, v_match_type, v_player_rating, v_player_rating + v_total_delta, v_total_delta, v_k, ROUND(v_team1_rating)::INTEGER, v_partner_rating);
  END LOOP;

  UPDATE matches SET elo_processed = true WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
