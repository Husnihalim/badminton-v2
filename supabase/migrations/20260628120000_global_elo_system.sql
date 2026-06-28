-- Global Elo System
-- Replaces per-club memberships.elo_rating with global singles_elo / doubles_elo on profiles

-- ============================================
-- 1. Add global Elo columns to profiles
-- ============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS singles_elo INTEGER NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS doubles_elo INTEGER NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS singles_games INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS doubles_games INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- 2. Add elo_processed flag to matches
-- ============================================
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS elo_processed BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 3. Elo history table (global)
-- ============================================
CREATE TABLE IF NOT EXISTS elo_history_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('singles', 'doubles')),
  elo_before INTEGER NOT NULL,
  elo_after INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  k_factor INTEGER NOT NULL,
  opponent_rating_avg INTEGER NOT NULL,
  partner_rating INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elo_history_global_profile ON elo_history_global(profile_id);
CREATE INDEX IF NOT EXISTS idx_elo_history_global_match ON elo_history_global(match_id);
CREATE INDEX IF NOT EXISTS idx_elo_history_global_created ON elo_history_global(profile_id, created_at DESC);

ALTER TABLE elo_history_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elo history viewable by everyone"
  ON elo_history_global FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 4. Elo calculation function
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_elo_delta(
  p_player_rating INTEGER,
  p_opponent_rating_avg INTEGER,
  p_outcome INTEGER, -- 1 for win, 0 for loss
  p_games_played INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_expected NUMERIC;
  v_k INTEGER;
  v_delta NUMERIC;
BEGIN
  v_expected := 1.0 / (1.0 + power(10.0, (p_opponent_rating_avg - p_player_rating) / 400.0));

  IF p_games_played < 20 THEN
    v_k := 40;
  ELSIF p_games_played < 60 THEN
    v_k := 20;
  ELSE
    v_k := 10;
  END IF;

  v_delta := v_k * (p_outcome - v_expected);
  RETURN ROUND(v_delta)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. Partner-gap weighting for doubles
-- ============================================
CREATE OR REPLACE FUNCTION public.doubles_partner_shares(
  p_rating_1 INTEGER,
  p_rating_2 INTEGER,
  p_total_delta INTEGER,
  OUT share_1 INTEGER,
  OUT share_2 INTEGER
) AS $$
DECLARE
  v_gap INTEGER;
  v_gap_factor NUMERIC;
BEGIN
  v_gap := abs(p_rating_1 - p_rating_2);
  v_gap_factor := least(0.5, v_gap::NUMERIC / 1000.0);

  IF p_rating_1 >= p_rating_2 THEN
    share_1 := ROUND(p_total_delta * (1.0 - v_gap_factor) / 2.0)::INTEGER;
    share_2 := ROUND(p_total_delta * (1.0 + v_gap_factor) / 2.0)::INTEGER;
  ELSE
    share_1 := ROUND(p_total_delta * (1.0 + v_gap_factor) / 2.0)::INTEGER;
    share_2 := ROUND(p_total_delta * (1.0 - v_gap_factor) / 2.0)::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 6. Match trigger function
-- Fires once per match (elo_processed guard)
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
  -- Only process once per match
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT match_type INTO v_match_type FROM matches WHERE id = NEW.match_id;
  IF v_match_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if already processed
  IF EXISTS (SELECT 1 FROM matches WHERE id = NEW.match_id AND elo_processed = true) THEN
    RETURN NEW;
  END IF;

  -- Collect participants
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

  -- Calculate sets won from ALL sets
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

  -- Mark processed immediately to prevent re-entry
  UPDATE matches SET elo_processed = true WHERE id = NEW.match_id;

  -- Process team 1
  FOR v_i IN 1 .. array_length(v_team1_user_ids, 1) LOOP
    IF v_match_type = 'doubles' THEN
      SELECT doubles_elo, doubles_games INTO v_player_rating, v_player_games
      FROM profiles WHERE id = v_team1_user_ids[v_i];
    ELSE
      SELECT singles_elo, singles_games INTO v_player_rating, v_player_games
      FROM profiles WHERE id = v_team1_user_ids[v_i];
    END IF;

    v_total_delta := calculate_elo_delta(v_player_rating, ROUND(v_team2_rating)::INTEGER, v_team1_outcome, v_player_games);

    -- Partner-gap weighting
    IF v_match_type = 'doubles' AND array_length(v_team1_ratings, 1) > 1 THEN
      PERFORM doubles_partner_shares(v_team1_ratings[1], v_team1_ratings[2], v_total_delta, v_share1, v_share2);
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

  -- Process team 2
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
      PERFORM doubles_partner_shares(v_team2_ratings[1], v_team2_ratings[2], v_total_delta, v_share1, v_share2);
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
-- 7. Trigger on score_sets INSERT
-- ============================================
DROP TRIGGER IF EXISTS tr_score_sets_process_elo ON score_sets;
CREATE TRIGGER tr_score_sets_process_elo
  AFTER INSERT ON score_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.process_match_elo();

-- ============================================
-- 8. Remove old per-club Elo system
-- ============================================
DROP TRIGGER IF EXISTS on_match_change_recalculate_elo ON matches;
DROP TRIGGER IF EXISTS on_participant_change_recalculate_elo ON match_participants;
DROP TRIGGER IF EXISTS on_score_set_change_recalculate_elo ON score_sets;

DROP FUNCTION IF EXISTS public.tr_matches_recalculate_elo();
DROP FUNCTION IF EXISTS public.tr_match_details_recalculate_elo();

COMMENT ON COLUMN memberships.elo_rating IS 'DEPRECATED - use profiles.singles_elo / doubles_elo instead';

-- ============================================
-- 9. Manual recalc function (idempotent)
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

  -- Delete existing elo history for this match (idempotent re-run)
  DELETE FROM elo_history_global WHERE match_id = p_match_id;

  -- Reverse previous profile updates by checking history
  -- Instead: we recalculate from scratch using current profile values

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
      PERFORM doubles_partner_shares(v_team1_ratings[1], v_team1_ratings[2], v_total_delta, v_share1, v_share2);
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
      PERFORM doubles_partner_shares(v_team2_ratings[1], v_team2_ratings[2], v_total_delta, v_share1, v_share2);
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

-- ============================================
-- 10. Updated leaderboard function
-- ============================================
CREATE OR REPLACE FUNCTION public.get_club_leaderboard(
  target_club_id UUID,
  row_limit INTEGER DEFAULT 10,
  match_type_filter TEXT DEFAULT 'singles'
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  elo INTEGER,
  games INTEGER,
  wins INTEGER,
  losses INTEGER,
  win_percentage NUMERIC,
  rank BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH club_matches AS (
    SELECT m.id
    FROM matches m
    WHERE m.club_id = target_club_id AND m.match_type = match_type_filter
  ),
  player_matches AS (
    SELECT
      mp.user_id,
      CASE
        WHEN mp.team = 1 AND ms.team1_sets > ms.team2_sets THEN 1
        WHEN mp.team = 2 AND ms.team2_sets > ms.team1_sets THEN 1
        ELSE 0
      END AS is_win
    FROM match_participants mp
    JOIN club_matches cm ON cm.id = mp.match_id
    JOIN (
      SELECT ss.match_id,
        COUNT(CASE WHEN ss.team1_score > ss.team2_score THEN 1 END) AS team1_sets,
        COUNT(CASE WHEN ss.team2_score > ss.team1_score THEN 1 END) AS team2_sets
      FROM score_sets ss
      GROUP BY ss.match_id
      HAVING COUNT(CASE WHEN ss.team1_score > ss.team2_score THEN 1 END)
           <> COUNT(CASE WHEN ss.team2_score > ss.team1_score THEN 1 END)
    ) ms ON ms.match_id = mp.match_id
    WHERE mp.is_guest = false AND mp.user_id IS NOT NULL
  ),
  player_stats AS (
    SELECT user_id, COUNT(*)::INTEGER AS games, SUM(is_win)::INTEGER AS wins,
      (COUNT(*) - SUM(is_win))::INTEGER AS losses
    FROM player_matches
    GROUP BY user_id
  )
  SELECT
    p.id AS user_id,
    COALESCE(p.display_name, p.name) AS name,
    CASE WHEN match_type_filter = 'doubles' THEN p.doubles_elo ELSE p.singles_elo END AS elo,
    CASE WHEN match_type_filter = 'doubles' THEN p.doubles_games ELSE p.singles_games END AS games,
    COALESCE(ps.wins, 0)::INTEGER AS wins,
    COALESCE(ps.losses, 0)::INTEGER AS losses,
    CASE WHEN COALESCE(ps.games, 0) > 0
      THEN ROUND((ps.wins::NUMERIC / ps.games) * 100, 0)
      ELSE 0
    END AS win_percentage,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN match_type_filter = 'doubles' THEN p.doubles_elo ELSE p.singles_elo END DESC,
        COALESCE(ps.wins, 0) DESC,
        p.name ASC
    ) AS rank
  FROM profiles p
  LEFT JOIN player_stats ps ON ps.user_id = p.id
  WHERE p.id IN (
    SELECT user_id FROM memberships WHERE club_id = target_club_id AND status = 'active'
  )
  AND CASE WHEN match_type_filter = 'doubles' THEN p.doubles_games ELSE p.singles_games END >= 3
  ORDER BY rank
  LIMIT row_limit;
$$;

REVOKE ALL ON FUNCTION public.get_club_leaderboard(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_club_leaderboard(UUID, INTEGER, TEXT) TO authenticated;

-- ============================================
-- 11. Update dashboard RPC to use global Elo
-- ============================================
CREATE OR REPLACE FUNCTION public.get_player_dashboard(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clubs JSONB;
  v_events JSONB;
  v_matches JSONB;
  v_stats JSONB;
  v_achievements JSONB;
  v_result JSONB;
  v_player_name TEXT;
  v_player_display_name TEXT;

  -- Stats variables
  v_played INTEGER := 0;
  v_wins INTEGER := 0;
  v_losses INTEGER := 0;
  v_win_rate INTEGER := 0;
  v_streak INTEGER := 0;
  v_streak_type TEXT := NULL;

  -- Achievement variables
  v_ach_on_fire BOOLEAN := FALSE;
  v_ach_giant_slayer BOOLEAN := FALSE;
  v_ach_clean_sweep BOOLEAN := FALSE;
  v_ach_iron_man BOOLEAN := FALSE;
  v_ach_dynamic_duo BOOLEAN := FALSE;
BEGIN
  -- 0. Get player details
  SELECT name, display_name INTO v_player_name, v_player_display_name
  FROM public.profiles
  WHERE id = p_user_id;

  -- 1. Fetch Clubs (using global singles_elo from profiles)
  WITH club_ranks AS (
    SELECT
      m.club_id,
      m.user_id,
      p.singles_elo AS user_elo,
      ROW_NUMBER() OVER(PARTITION BY m.club_id ORDER BY p.singles_elo DESC, m.joined_at ASC)::INTEGER AS rank_pos,
      COUNT(*) OVER(PARTITION BY m.club_id)::INTEGER AS total_ranked
    FROM public.memberships m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.status = 'active'
      AND EXISTS (
        SELECT 1
        FROM public.match_participants mp
        JOIN public.matches ma ON ma.id = mp.match_id
        WHERE mp.user_id = m.user_id AND ma.club_id = m.club_id
      )
  ),
  club_member_stats AS (
    SELECT
      club_id,
      COUNT(*)::INTEGER AS members_count,
      ROUND(AVG(p.singles_elo))::INTEGER AS avg_elo
    FROM public.memberships m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.status = 'active'
    GROUP BY club_id
  ),
  club_data AS (
    SELECT
      c.id,
      c.name,
      c.description,
      c.location,
      c.city,
      c.sport_focus,
      c.logo_url,
      c.banner_url,
      c.banner_preset,
      c.accent_color,
      m.role,
      p.singles_elo,
      cr.rank_pos,
      cr.total_ranked,
      COALESCE(cms.members_count, 0) AS members_count,
      COALESCE(cms.avg_elo, 1200) AS avg_elo
    FROM public.memberships m
    JOIN public.clubs c ON c.id = m.club_id
    JOIN public.profiles p ON p.id = m.user_id
    LEFT JOIN club_member_stats cms ON cms.club_id = c.id
    LEFT JOIN club_ranks cr ON cr.club_id = c.id AND cr.user_id = p_user_id
    WHERE m.user_id = p_user_id AND m.status = 'active'
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', cd.id,
      'name', cd.name,
      'description', cd.description,
      'location', cd.location,
      'city', cd.city,
      'sport_focus', cd.sport_focus,
      'logo_url', cd.logo_url,
      'banner_url', cd.banner_url,
      'banner_preset', cd.banner_preset,
      'accent_color', cd.accent_color,
      'role', cd.role,
      'singles_elo', cd.singles_elo,
      'rank', jsonb_build_object('rank', cd.rank_pos, 'total', cd.total_ranked),
      'members_count', cd.members_count,
      'avg_elo', cd.avg_elo
    )
  ), '[]'::jsonb) INTO v_clubs
  FROM club_data cd;

  -- 2. Fetch Upcoming Events across joined clubs
  SELECT COALESCE(
    (SELECT jsonb_agg(event_data) FROM (
      SELECT jsonb_build_object(
        'id', e.id,
        'club_id', e.club_id,
        'club_name', c.name,
        'title', e.title,
        'event_date', e.event_date,
        'location', e.location,
        'cost_amount', e.cost_amount,
        'cost_note', e.cost_note,
        'max_participants', e.max_participants,
        'signup_open', e.signup_open,
        'created_by', e.created_by,
        'rsvp_status', r.status,
        'attendees_count', (SELECT COUNT(*)::INTEGER FROM public.event_rsvps WHERE event_id = e.id AND status = 'going')
      ) AS event_data
      FROM public.events e
      JOIN public.clubs c ON c.id = e.club_id
      LEFT JOIN public.event_rsvps r ON r.event_id = e.id AND r.user_id = p_user_id
      WHERE e.club_id IN (
        SELECT club_id FROM public.memberships WHERE user_id = p_user_id AND status = 'active'
      )
      AND e.event_date >= NOW()
      ORDER BY e.event_date ASC
    ) subq),
    '[]'::jsonb
  ) INTO v_events;

  -- 3. Fetch Recent Matches across joined clubs where the player participated
  WITH recent_match_ids AS (
    SELECT m.id
    FROM public.matches m
    JOIN public.match_participants mp ON mp.match_id = m.id
    WHERE mp.user_id = p_user_id
      AND m.club_id IN (
        SELECT club_id FROM public.memberships WHERE user_id = p_user_id AND status = 'active'
      )
    ORDER BY m.created_at DESC
    LIMIT 10
  ),
  match_details AS (
    SELECT
      m.id,
      m.club_id,
      c.name AS club_name,
      m.title,
      m.sport,
      m.match_type,
      m.match_date,
      m.recorded_by,
      m.created_at,
      COALESCE(
        (SELECT jsonb_agg(item) FROM (
          SELECT jsonb_build_object(
            'id', mp.id,
            'match_id', mp.match_id,
            'user_id', mp.user_id,
            'team', mp.team,
            'is_guest', mp.is_guest,
            'guest_name', mp.guest_name,
            'name', COALESCE(p.display_name, p.name, mp.guest_name, 'Guest'),
            'profile', CASE WHEN p.id IS NOT NULL THEN jsonb_build_object('id', p.id, 'name', p.name, 'display_name', p.display_name, 'avatar_url', p.avatar_url) ELSE NULL END
          ) AS item
          FROM public.match_participants mp
          LEFT JOIN public.profiles p ON p.id = mp.user_id
          WHERE mp.match_id = m.id
        ) participant_items),
        '[]'::jsonb
      ) AS participants,
      COALESCE(
        (SELECT jsonb_agg(item) FROM (
          SELECT jsonb_build_object(
            'id', ss.id,
            'match_id', ss.match_id,
            'set_number', ss.set_number,
            'team1_score', ss.team1_score,
            'team2_score', ss.team2_score
          ) AS item
          FROM public.score_sets ss
          WHERE ss.match_id = m.id
          ORDER BY ss.set_number ASC
        ) set_items),
        '[]'::jsonb
      ) AS score_sets
    FROM public.matches m
    JOIN public.clubs c ON c.id = m.club_id
    WHERE m.id IN (SELECT id FROM recent_match_ids)
  )
  SELECT COALESCE(
    (SELECT jsonb_agg(item) FROM (
      SELECT jsonb_build_object(
        'id', md.id,
        'club_id', md.club_id,
        'clubName', md.club_name,
        'title', md.title,
        'sport', md.sport,
        'match_type', md.match_type,
        'match_date', md.match_date,
        'recorded_by', md.recorded_by,
        'created_at', md.created_at,
        'participants', md.participants,
        'score_sets', md.score_sets
      ) AS item
      FROM match_details md
      ORDER BY md.created_at DESC
    ) match_items),
    '[]'::jsonb
  ) INTO v_matches;

  -- 4. Calculate Personal Stats
  DECLARE
    r_match RECORD;
    v_win BOOLEAN;
    v_is_streak_broken BOOLEAN := FALSE;
  BEGIN
    FOR r_match IN (
      SELECT
        m.id,
        mp.team AS user_team,
        (SELECT COUNT(*)::INTEGER FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team1_score > ss.team2_score) AS team1_sets,
        (SELECT COUNT(*)::INTEGER FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team2_score > ss.team1_score) AS team2_sets
      FROM public.matches m
      JOIN public.match_participants mp ON mp.match_id = m.id AND mp.user_id = p_user_id
      ORDER BY m.match_date DESC, m.created_at DESC
    ) LOOP
      IF r_match.team1_sets = r_match.team2_sets THEN
        CONTINUE;
      END IF;

      v_played := v_played + 1;

      IF (r_match.team1_sets > r_match.team2_sets AND r_match.user_team = 1) OR
         (r_match.team2_sets > r_match.team1_sets AND r_match.user_team = 2) THEN
        v_wins := v_wins + 1;
        v_win := TRUE;
      ELSE
        v_losses := v_losses + 1;
        v_win := FALSE;
      END IF;

      -- Streak
      IF NOT v_is_streak_broken THEN
        IF v_streak_type IS NULL THEN
          v_streak_type := CASE WHEN v_win THEN 'win' ELSE 'loss' END;
          v_streak := 1;
        ELSIF (v_streak_type = 'win' AND v_win) OR (v_streak_type = 'loss' AND NOT v_win) THEN
          v_streak := v_streak + 1;
        ELSE
          v_is_streak_broken := TRUE;
        END IF;
      END IF;
    END LOOP;
  END;

  IF v_played > 0 THEN
    v_win_rate := ROUND((v_wins::NUMERIC / v_played) * 100);
  END IF;

  v_stats := jsonb_build_object(
    'matchesPlayed', v_played,
    'wins', v_wins,
    'losses', v_losses,
    'winRate', v_win_rate,
    'streak', v_streak,
    'streakType', v_streak_type
  );

  -- 5. Calculate Achievements
  -- 5.1 On Fire (3+ Win Streak)
  IF v_streak_type = 'win' AND v_streak >= 3 THEN
    v_ach_on_fire := TRUE;
  END IF;

  -- 5.2 Clean Sweep (Won a set by 10+ points in any match)
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.match_participants mp ON mp.match_id = m.id AND mp.user_id = p_user_id
    JOIN public.score_sets ss ON ss.match_id = m.id
    WHERE (mp.team = 1 AND ss.team1_score - ss.team2_score >= 10) OR
          (mp.team = 2 AND ss.team2_score - ss.team1_score >= 10)
  ) INTO v_ach_clean_sweep;

  -- 5.3 Iron Man (Play 3+ matches in 1 day)
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT COALESCE(m.match_date, m.created_at::date) AS m_date, COUNT(*) AS match_count
      FROM public.matches m
      JOIN public.match_participants mp ON mp.match_id = m.id AND mp.user_id = p_user_id
      GROUP BY m_date
    ) d
    WHERE d.match_count >= 3
  ) INTO v_ach_iron_man;

  -- 5.4 Dynamic Duo (3+ doubles win streak with same partner)
  DECLARE
    r_doubles RECORD;
    v_prev_partner UUID := NULL;
    v_prev_partner_guest TEXT := NULL;
    v_partner_streak INTEGER := 0;
  BEGIN
    FOR r_doubles IN (
      SELECT
        m.id,
        mp.team AS user_team,
        (SELECT id FROM public.match_participants WHERE match_id = m.id AND team = mp.team AND user_id <> p_user_id AND is_guest = FALSE LIMIT 1) AS partner_user_id,
        (SELECT guest_name FROM public.match_participants WHERE match_id = m.id AND team = mp.team AND is_guest = TRUE LIMIT 1) AS partner_guest_name,
        (SELECT COUNT(*)::INTEGER FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team1_score > ss.team2_score) AS team1_sets,
        (SELECT COUNT(*)::INTEGER FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team2_score > ss.team1_score) AS team2_sets
      FROM public.matches m
      JOIN public.match_participants mp ON mp.match_id = m.id AND mp.user_id = p_user_id
      WHERE m.match_type = 'doubles'
      ORDER BY m.match_date ASC, m.created_at ASC
    ) LOOP
      IF r_doubles.team1_sets = r_doubles.team2_sets THEN
        CONTINUE;
      END IF;

      IF (r_doubles.team1_sets > r_doubles.team2_sets AND r_doubles.user_team = 1) OR
         (r_doubles.team2_sets > r_doubles.team1_sets AND r_doubles.user_team = 2) THEN
        -- Win
        IF (r_doubles.partner_user_id IS NOT NULL AND v_prev_partner = r_doubles.partner_user_id) OR
           (r_doubles.partner_guest_name IS NOT NULL AND v_prev_partner_guest = r_doubles.partner_guest_name) THEN
          v_partner_streak := v_partner_streak + 1;
        ELSE
          v_partner_streak := 1;
        END IF;

        v_prev_partner := r_doubles.partner_user_id;
        v_prev_partner_guest := r_doubles.partner_guest_name;

        IF v_partner_streak >= 3 THEN
          v_ach_dynamic_duo := TRUE;
        END IF;
      ELSE
        -- Loss
        v_partner_streak := 0;
        v_prev_partner := NULL;
        v_prev_partner_guest := NULL;
      END IF;
    END LOOP;
  END;

  -- 5.5 Giant Slayer (Beat an opponent who has a higher ELO rating - using global singles_elo)
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.match_participants mp_user ON mp_user.match_id = m.id AND mp_user.user_id = p_user_id
    JOIN public.match_participants mp_opp ON mp_opp.match_id = m.id AND mp_opp.team <> mp_user.team
    JOIN public.profiles p_user ON p_user.id = p_user_id
    JOIN public.profiles p_opp ON p_opp.id = mp_opp.user_id
    WHERE
      (((SELECT COUNT(*) FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team1_score > ss.team2_score) >
        (SELECT COUNT(*) FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team2_score > ss.team1_score) AND mp_user.team = 1) OR
       ((SELECT COUNT(*) FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team2_score > ss.team1_score) >
        (SELECT COUNT(*) FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team1_score > ss.team2_score) AND mp_user.team = 2))
      AND p_opp.singles_elo > p_user.singles_elo
  ) INTO v_ach_giant_slayer;

  v_achievements := jsonb_build_object(
    'onFire', v_ach_on_fire,
    'cleanSweep', v_ach_clean_sweep,
    'ironMan', v_ach_iron_man,
    'dynamicDuo', v_ach_dynamic_duo,
    'giantSlayer', v_ach_giant_slayer
  );

  -- 6. Combine all sections into a single JSON response
  v_result := jsonb_build_object(
    'clubs', v_clubs,
    'upcoming_events', v_events,
    'recent_matches', v_matches,
    'stats', v_stats,
    'achievements', v_achievements
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_dashboard(UUID) TO authenticated;
