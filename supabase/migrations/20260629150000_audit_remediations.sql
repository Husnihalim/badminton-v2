-- Remediate ELO calculations, security constraints, RLS visibility, self-removal, leaderboard caching, and incremental rebuild optimizations.

-- 1. Prevent duplicate players in matches (ELO Boosting Exploit)
ALTER TABLE public.match_participants
  DROP CONSTRAINT IF EXISTS unique_match_player;
ALTER TABLE public.match_participants
  ADD CONSTRAINT unique_match_player UNIQUE (match_id, user_id);

-- 2. Allow self-service membership deactivations
DROP POLICY IF EXISTS "Users can deactivate own membership" ON public.memberships;
CREATE POLICY "Users can deactivate own membership"
  ON public.memberships FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = 'inactive' AND role = 'member');

-- 3. Modify remove_club_member function to allow self-deactivation
CREATE OR REPLACE FUNCTION public.remove_club_member(
  target_club_id UUID,
  target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_membership memberships;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- If user is removing themselves, bypass admin check but verify role
  IF current_user_id = target_user_id THEN
    SELECT *
    INTO target_membership
    FROM memberships
    WHERE club_id = target_club_id
      AND user_id = target_user_id
      AND status = 'active';

    IF target_membership.id IS NULL THEN
      RAISE EXCEPTION 'Active membership not found';
    END IF;

    IF target_membership.role = 'owner' THEN
      RAISE EXCEPTION 'Club owners cannot leave their own club';
    END IF;

    UPDATE memberships
    SET status = 'inactive',
        role = 'member',
        updated_at = NOW()
    WHERE id = target_membership.id;

    RETURN;
  END IF;

  -- Admin flow
  IF NOT private.is_club_admin(target_club_id) THEN
    RAISE EXCEPTION 'Only club admins can remove members';
  END IF;

  SELECT *
  INTO target_membership
  FROM memberships
  WHERE club_id = target_club_id
    AND user_id = target_user_id
    AND status = 'active';

  IF target_membership.id IS NULL THEN
    RAISE EXCEPTION 'Active membership not found';
  END IF;

  IF target_membership.role = 'owner' THEN
    RAISE EXCEPTION 'Club owners cannot be removed';
  END IF;

  UPDATE memberships
  SET status = 'inactive',
      role = 'member',
      updated_at = NOW()
  WHERE id = target_membership.id;
END;
$$;

-- 4. Expand Profiles SELECT policy to include cross-club opponents
DROP POLICY IF EXISTS "Profiles are viewable by self, same club members, or superadmins" ON public.profiles;
CREATE POLICY "Profiles are viewable by self, same club members, or superadmins"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR private.share_any_club(auth.uid(), id)
    OR private.is_platform_superadmin()
    OR EXISTS (
      SELECT 1
      FROM public.competition_matchups cm
      JOIN public.competition_participants cp1 ON (cp1.id = cm.participant_a_id OR cp1.id = cm.participant_b_id)
      JOIN public.competition_participants cp2 ON (cp2.id = cm.participant_a_id OR cp2.id = cm.participant_b_id)
      WHERE cm.match_id IS NOT NULL
        AND cm.status = 'completed'
        AND (cp1.user_1_id = auth.uid() OR cp1.user_2_id = auth.uid())
        AND (cp2.user_1_id = profiles.id OR cp2.user_2_id = profiles.id)
    )
  );

-- 5. Create leaderboard cache table
CREATE TABLE IF NOT EXISTS public.club_leaderboard_cache (
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  match_type TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT,
  elo INTEGER,
  games INTEGER,
  wins INTEGER,
  losses INTEGER,
  win_percentage NUMERIC,
  rank BIGINT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (club_id, match_type, user_id)
);

ALTER TABLE public.club_leaderboard_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leaderboard cache is viewable by authenticated users" ON public.club_leaderboard_cache;
CREATE POLICY "Leaderboard cache is viewable by authenticated users"
  ON public.club_leaderboard_cache FOR SELECT
  TO authenticated
  USING (true);

-- 6. Leaderboard Cache Refresh function
CREATE OR REPLACE FUNCTION public.refresh_club_leaderboard_cache(p_club_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.club_leaderboard_cache WHERE club_id = p_club_id;

  -- Singles Standings
  INSERT INTO public.club_leaderboard_cache (club_id, match_type, user_id, name, elo, games, wins, losses, win_percentage, rank)
  SELECT
    p_club_id,
    'singles',
    l.user_id,
    l.name,
    l.elo,
    l.games,
    l.wins,
    l.losses,
    l.win_percentage,
    l.rank
  FROM (
    WITH eligible_matches AS (
      SELECT DISTINCT m.id
      FROM matches m
      WHERE m.club_id = p_club_id
         OR EXISTS (
           SELECT 1
           FROM competition_clubs cc
           WHERE cc.competition_id = m.tournament_id
             AND cc.club_id = p_club_id
             AND cc.status = 'confirmed'
         )
    ),
    player_matches AS (
      SELECT
        mp.user_id,
        CASE WHEN mp.team = ms.winning_team THEN 1 ELSE 0 END AS is_win
      FROM match_participants mp
      JOIN matches m ON m.id = mp.match_id
      JOIN eligible_matches em ON em.id = m.id
      JOIN (
        SELECT
          ss.match_id,
          CASE
            WHEN COUNT(CASE WHEN ss.team1_score > ss.team2_score THEN 1 END)
               > COUNT(CASE WHEN ss.team2_score > ss.team1_score THEN 1 END) THEN 1
            WHEN COUNT(CASE WHEN ss.team2_score > ss.team1_score THEN 1 END)
               > COUNT(CASE WHEN ss.team1_score > ss.team2_score THEN 1 END) THEN 2
            ELSE NULL
          END AS winning_team
        FROM score_sets ss
        GROUP BY ss.match_id
      ) ms ON ms.match_id = mp.match_id
      WHERE mp.is_guest = false
        AND mp.user_id IS NOT NULL
        AND ms.winning_team IS NOT NULL
        AND m.match_type = 'singles'
    ),
    player_stats AS (
      SELECT
        user_id,
        COUNT(*)::INTEGER AS games,
        SUM(is_win)::INTEGER AS wins,
        (COUNT(*) - SUM(is_win))::INTEGER AS losses
      FROM player_matches
      GROUP BY user_id
    ),
    ranked AS (
      SELECT
        p.id AS user_id,
        COALESCE(p.display_name, p.name) AS name,
        p.singles_elo AS elo,
        COALESCE(ps.games, 0)::INTEGER AS games,
        COALESCE(ps.wins, 0)::INTEGER AS wins,
        COALESCE(ps.losses, 0)::INTEGER AS losses,
        CASE WHEN COALESCE(ps.games, 0) > 0
          THEN ROUND((ps.wins::NUMERIC / ps.games) * 100, 0)
          ELSE 0
        END AS win_percentage
      FROM profiles p
      LEFT JOIN player_stats ps ON ps.user_id = p.id
      WHERE p.id IN (
        SELECT user_id
        FROM memberships
        WHERE club_id = p_club_id
          AND status = 'active'
      )
        AND COALESCE(ps.games, 0) > 0
    )
    SELECT
      ranked.user_id,
      ranked.name,
      ranked.elo,
      ranked.games,
      ranked.wins,
      ranked.losses,
      ranked.win_percentage,
      ROW_NUMBER() OVER (
        ORDER BY ranked.elo DESC, ranked.win_percentage DESC, ranked.wins DESC, ranked.name ASC
      ) AS rank
    FROM ranked
  ) l;

  -- Doubles Standings
  INSERT INTO public.club_leaderboard_cache (club_id, match_type, user_id, name, elo, games, wins, losses, win_percentage, rank)
  SELECT
    p_club_id,
    'doubles',
    l.user_id,
    l.name,
    l.elo,
    l.games,
    l.wins,
    l.losses,
    l.win_percentage,
    l.rank
  FROM (
    WITH eligible_matches AS (
      SELECT DISTINCT m.id
      FROM matches m
      WHERE m.club_id = p_club_id
         OR EXISTS (
           SELECT 1
           FROM competition_clubs cc
           WHERE cc.competition_id = m.tournament_id
             AND cc.club_id = p_club_id
             AND cc.status = 'confirmed'
         )
    ),
    player_matches AS (
      SELECT
        mp.user_id,
        CASE WHEN mp.team = ms.winning_team THEN 1 ELSE 0 END AS is_win
      FROM match_participants mp
      JOIN matches m ON m.id = mp.match_id
      JOIN eligible_matches em ON em.id = m.id
      JOIN (
        SELECT
          ss.match_id,
          CASE
            WHEN COUNT(CASE WHEN ss.team1_score > ss.team2_score THEN 1 END)
               > COUNT(CASE WHEN ss.team2_score > ss.team1_score THEN 1 END) THEN 1
            WHEN COUNT(CASE WHEN ss.team2_score > ss.team1_score THEN 1 END)
               > COUNT(CASE WHEN ss.team1_score > ss.team2_score THEN 1 END) THEN 2
            ELSE NULL
          END AS winning_team
        FROM score_sets ss
        GROUP BY ss.match_id
      ) ms ON ms.match_id = mp.match_id
      WHERE mp.is_guest = false
        AND mp.user_id IS NOT NULL
        AND ms.winning_team IS NOT NULL
        AND m.match_type = 'doubles'
    ),
    player_stats AS (
      SELECT
        user_id,
        COUNT(*)::INTEGER AS games,
        SUM(is_win)::INTEGER AS wins,
        (COUNT(*) - SUM(is_win))::INTEGER AS losses
      FROM player_matches
      GROUP BY user_id
    ),
    ranked AS (
      SELECT
        p.id AS user_id,
        COALESCE(p.display_name, p.name) AS name,
        p.doubles_elo AS elo,
        COALESCE(ps.games, 0)::INTEGER AS games,
        COALESCE(ps.wins, 0)::INTEGER AS wins,
        COALESCE(ps.losses, 0)::INTEGER AS losses,
        CASE WHEN COALESCE(ps.games, 0) > 0
          THEN ROUND((ps.wins::NUMERIC / ps.games) * 100, 0)
          ELSE 0
        END AS win_percentage
      FROM profiles p
      LEFT JOIN player_stats ps ON ps.user_id = p.id
      WHERE p.id IN (
        SELECT user_id
        FROM memberships
        WHERE club_id = p_club_id
          AND status = 'active'
      )
        AND COALESCE(ps.games, 0) > 0
    )
    SELECT
      ranked.user_id,
      ranked.name,
      ranked.elo,
      ranked.games,
      ranked.wins,
      ranked.losses,
      ranked.win_percentage,
      ROW_NUMBER() OVER (
        ORDER BY ranked.elo DESC, ranked.win_percentage DESC, ranked.wins DESC, ranked.name ASC
      ) AS rank
    FROM ranked
  ) l;
END;
$$;

-- Redirect get_club_leaderboard to the cached table
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
  SELECT 
    c.user_id,
    c.name,
    c.elo,
    c.games,
    c.wins,
    c.losses,
    c.win_percentage,
    c.rank
  FROM club_leaderboard_cache c
  WHERE c.club_id = target_club_id
    AND c.match_type = match_type_filter
  ORDER BY c.rank ASC
  LIMIT row_limit;
$$;

REVOKE ALL ON FUNCTION public.get_club_leaderboard(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_club_leaderboard(UUID, INTEGER, TEXT) TO authenticated;

-- 7. Update process_match_elo and recalculate_match_elo for guest doubles ELO splits and cache updates
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
  v_club_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT match_type, club_id INTO v_match_type, v_club_id FROM matches WHERE id = NEW.match_id;
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

    IF v_match_type = 'doubles' THEN
      IF array_length(v_team1_ratings, 1) > 1 THEN
        SELECT share_1, share_2 INTO v_share1, v_share2
        FROM doubles_partner_shares(v_team1_ratings[1], v_team1_ratings[2], v_total_delta);
        IF v_i = 1 THEN v_total_delta := v_share1; ELSE v_total_delta := v_share2; END IF;
      ELSE
        v_total_delta := ROUND(v_total_delta / 2.0)::INTEGER;
      END IF;
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

    IF v_match_type = 'doubles' THEN
      IF array_length(v_team2_ratings, 1) > 1 THEN
        SELECT share_1, share_2 INTO v_share1, v_share2
        FROM doubles_partner_shares(v_team2_ratings[1], v_team2_ratings[2], v_total_delta);
        IF v_i = 1 THEN v_total_delta := v_share1; ELSE v_total_delta := v_share2; END IF;
      ELSE
        v_total_delta := ROUND(v_total_delta / 2.0)::INTEGER;
      END IF;
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

  IF v_club_id IS NOT NULL THEN
    PERFORM public.refresh_club_leaderboard_cache(v_club_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  v_club_id UUID;
BEGIN
  SELECT match_type, club_id INTO v_match_type, v_club_id FROM matches WHERE id = p_match_id;
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

    IF v_match_type = 'doubles' THEN
      IF array_length(v_team1_ratings, 1) > 1 THEN
        SELECT share_1, share_2 INTO v_share1, v_share2
        FROM doubles_partner_shares(v_team1_ratings[1], v_team1_ratings[2], v_total_delta);
        IF v_i = 1 THEN v_total_delta := v_share1; ELSE v_total_delta := v_share2; END IF;
      ELSE
        v_total_delta := ROUND(v_total_delta / 2.0)::INTEGER;
      END IF;
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

    IF v_match_type = 'doubles' THEN
      IF array_length(v_team2_ratings, 1) > 1 THEN
        SELECT share_1, share_2 INTO v_share1, v_share2
        FROM doubles_partner_shares(v_team2_ratings[1], v_team2_ratings[2], v_total_delta);
        IF v_i = 1 THEN v_total_delta := v_share1; ELSE v_total_delta := v_share2; END IF;
      ELSE
        v_total_delta := ROUND(v_total_delta / 2.0)::INTEGER;
      END IF;
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

  IF v_club_id IS NOT NULL THEN
    PERFORM public.refresh_club_leaderboard_cache(v_club_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Defer ELO trigger to transaction commit
DROP TRIGGER IF EXISTS tr_score_sets_process_elo ON public.score_sets;
CREATE CONSTRAINT TRIGGER tr_score_sets_process_elo
  AFTER INSERT ON public.score_sets
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.process_match_elo();

-- 9. Optimize ELO rebuilds to run incrementally from the cutoff match date
CREATE OR REPLACE FUNCTION public.rebuild_global_elo_incremental(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_date DATE;
  v_created_at TIMESTAMP WITH TIME ZONE;
  r_match RECORD;
  v_user RECORD;
  v_processed INTEGER := 0;
  v_skipped INTEGER := 0;
  v_error INTEGER := 0;
  v_last_singles_elo INTEGER;
  v_last_doubles_elo INTEGER;
  v_last_singles_games INTEGER;
  v_last_doubles_games INTEGER;
  v_club_id UUID;
BEGIN
  -- Get details of the target match
  SELECT match_date, created_at, club_id
  INTO v_match_date, v_created_at, v_club_id
  FROM public.matches
  WHERE id = p_match_id;

  IF v_match_date IS NULL THEN
    RAISE EXCEPTION 'Target match not found';
  END IF;

  -- 1. Identify all matches that are chronologically on or after the target match
  -- These will be deleted and recalculated.
  CREATE TEMP TABLE matches_to_rebuild ON COMMIT DROP AS
  SELECT m.id, m.club_id
  FROM public.matches m
  WHERE m.match_date > v_match_date
     OR (m.match_date = v_match_date AND m.created_at > v_created_at)
     OR (m.match_date = v_match_date AND m.created_at = v_created_at AND m.id >= p_match_id);

  -- 2. Identify all registered players whose ELO history will be modified
  CREATE TEMP TABLE users_to_restore ON COMMIT DROP AS
  SELECT DISTINCT user_id
  FROM public.match_participants
  WHERE match_id IN (SELECT id FROM matches_to_rebuild)
    AND is_guest = false
    AND user_id IS NOT NULL;

  -- 3. Rollback the ELO ratings and games counts of these players to the state immediately before the cutoff match
  FOR v_user IN (SELECT user_id FROM users_to_restore) LOOP
    -- Latest singles ELO before cutoff
    SELECT eh.elo_after
    INTO v_last_singles_elo
    FROM public.elo_history_global eh
    JOIN public.matches m ON m.id = eh.match_id
    WHERE eh.profile_id = v_user.user_id
      AND eh.match_type = 'singles'
      AND eh.match_id NOT IN (SELECT id FROM matches_to_rebuild)
    ORDER BY m.match_date DESC NULLS LAST, m.created_at DESC, m.id DESC
    LIMIT 1;

    -- Latest doubles ELO before cutoff
    SELECT eh.elo_after
    INTO v_last_doubles_elo
    FROM public.elo_history_global eh
    JOIN public.matches m ON m.id = eh.match_id
    WHERE eh.profile_id = v_user.user_id
      AND eh.match_type = 'doubles'
      AND eh.match_id NOT IN (SELECT id FROM matches_to_rebuild)
    ORDER BY m.match_date DESC NULLS LAST, m.created_at DESC, m.id DESC
    LIMIT 1;

    -- Count singles games before cutoff
    SELECT COUNT(*)::INTEGER
    INTO v_last_singles_games
    FROM public.match_participants mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.user_id = v_user.user_id
      AND mp.is_guest = false
      AND m.match_type = 'singles'
      AND m.elo_processed = true
      AND m.id NOT IN (SELECT id FROM matches_to_rebuild);

    -- Count doubles games before cutoff
    SELECT COUNT(*)::INTEGER
    INTO v_last_doubles_games
    FROM public.match_participants mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.user_id = v_user.user_id
      AND mp.is_guest = false
      AND m.match_type = 'doubles'
      AND m.elo_processed = true
      AND m.id NOT IN (SELECT id FROM matches_to_rebuild);

    -- Update player profile
    UPDATE public.profiles
    SET
      singles_elo = COALESCE(v_last_singles_elo, 1200),
      doubles_elo = COALESCE(v_last_doubles_elo, 1200),
      singles_games = COALESCE(v_last_singles_games, 0),
      doubles_games = COALESCE(v_last_doubles_games, 0)
    WHERE id = v_user.user_id;
  END LOOP;

  -- 4. Delete history and reset elo_processed for matches to rebuild
  DELETE FROM public.elo_history_global
  WHERE match_id IN (SELECT id FROM matches_to_rebuild);

  UPDATE public.matches
  SET elo_processed = false
  WHERE id IN (SELECT id FROM matches_to_rebuild);

  -- 5. Replay and recalculate ELO in chronological order
  FOR r_match IN (
    SELECT m.id
    FROM public.matches m
    JOIN matches_to_rebuild mtr ON mtr.id = m.id
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
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Incremental Elo rebuild failed for match %: %', r_match.id, SQLERRM;
      v_error := v_error + 1;
    END;
  END LOOP;

  -- Refresh leaderboard cache for all affected clubs
  FOR r_match IN (SELECT DISTINCT club_id FROM matches_to_rebuild WHERE club_id IS NOT NULL) LOOP
    PERFORM public.refresh_club_leaderboard_cache(r_match.club_id);
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'errors', v_error
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_club_leaderboard_cache(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_club_leaderboard_cache(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.refresh_club_leaderboard_cache(UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.process_match_elo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_match_elo() FROM anon;
REVOKE ALL ON FUNCTION public.process_match_elo() FROM authenticated;
REVOKE ALL ON FUNCTION public.recalculate_match_elo(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_match_elo(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.recalculate_match_elo(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.rebuild_global_elo_incremental(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rebuild_global_elo_incremental(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.rebuild_global_elo_incremental(UUID) FROM authenticated;

-- Route rebuild_global_elo_after_match_update to rebuild_global_elo_incremental
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

  RETURN public.rebuild_global_elo_incremental(p_match_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_global_elo_after_match_update(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rebuild_global_elo_after_match_update(UUID) TO authenticated;

-- 10. Seed/Populate the leaderboard cache for all existing clubs
DO $$
DECLARE
  r_club RECORD;
BEGIN
  FOR r_club IN (SELECT id FROM public.clubs) LOOP
    PERFORM public.refresh_club_leaderboard_cache(r_club.id);
  END LOOP;
END;
$$;
