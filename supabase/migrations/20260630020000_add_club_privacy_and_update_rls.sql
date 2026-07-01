-- Migration: Add club privacy controls and update visibility across RLS and RPCs
-- Created: 2026-06-30

-- 1. Add is_private column to clubs table
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- 2. Drop existing SELECT policies that restrict read boundaries to club members only
DROP POLICY IF EXISTS "Memberships viewable by club members" ON public.memberships;
DROP POLICY IF EXISTS "Users can view own membership or club members" ON public.memberships;
DROP POLICY IF EXISTS "Matches viewable by club members" ON public.matches;
DROP POLICY IF EXISTS "Match participants viewable by club members" ON public.match_participants;
DROP POLICY IF EXISTS "Score sets viewable by club members" ON public.score_sets;
DROP POLICY IF EXISTS "Events viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Club members can view event RSVPs" ON public.event_rsvps;
DROP POLICY IF EXISTS "Profiles are viewable by self, same club members, or superadmins" ON public.profiles;

-- 3. Create updated SELECT policies to support public/private club scopes

-- 3A. Profiles Select Policy (Public profiles viewable by anyone; private profiles restricted to self, same club members, or superadmins)
CREATE POLICY "Profiles are viewable by self, same club members, public, or superadmins"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR is_private = false
    OR is_private IS NULL
    OR (auth.uid() IS NOT NULL AND (
      private.share_any_club(auth.uid(), id)
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
    ))
  );

-- 3B. Memberships Select Policy (Public read for memberships of public clubs, else members-only)
CREATE POLICY "Memberships viewable if club is public or user is member"
  ON public.memberships FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM public.clubs c 
      WHERE c.id = memberships.club_id 
        AND c.is_private = false
    ))
    OR (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR private.is_active_club_member(club_id)))
  );

-- 3C. Matches Select Policy (Public read for matches of public clubs, else members-only)
CREATE POLICY "Matches viewable if club is public or user is member"
  ON public.matches FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM public.clubs c 
      WHERE c.id = matches.club_id 
        AND c.is_private = false
    ))
    OR (auth.uid() IS NOT NULL AND private.is_active_club_member(club_id))
  );

-- 3D. Match Participants Select Policy
CREATE POLICY "Match participants viewable if club is public or user is member"
  ON public.match_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.clubs c ON c.id = m.club_id
      WHERE m.id = match_participants.match_id
        AND (c.is_private = false OR (auth.uid() IS NOT NULL AND private.is_active_club_member(m.club_id)))
    )
  );

-- 3E. Score Sets Select Policy
CREATE POLICY "Score sets viewable if club is public or user is member"
  ON public.score_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.clubs c ON c.id = m.club_id
      WHERE m.id = score_sets.match_id
        AND (c.is_private = false OR (auth.uid() IS NOT NULL AND private.is_active_club_member(m.club_id)))
    )
  );

-- 3F. Events Select Policy (Hide events of private clubs from public search/rosters)
CREATE POLICY "Events viewable if club is public or user is member"
  ON public.events FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM public.clubs c 
      WHERE c.id = events.club_id 
        AND c.is_private = false
    ))
    OR (auth.uid() IS NOT NULL AND private.is_active_club_member(club_id))
  );

-- 3G. Event RSVPs Select Policy
CREATE POLICY "Event RSVPs viewable if club is public or user is member"
  ON public.event_rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.clubs c ON c.id = e.club_id
      WHERE e.id = event_rsvps.event_id
        AND (c.is_private = false OR (auth.uid() IS NOT NULL AND private.is_active_club_member(e.club_id)))
    )
  );


-- 4. Update get_player_matches RPC with caller membership/privacy constraints
CREATE OR REPLACE FUNCTION public.get_player_matches(p_user_id UUID, p_limit INTEGER DEFAULT 100)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH player_match_ids AS (
    SELECT DISTINCT match_id
    FROM public.match_participants
    WHERE user_id = p_user_id
  ),
  match_details AS (
    SELECT
      m.id,
      m.club_id,
      c.name AS "clubName",
      m.title,
      m.sport,
      m.match_type,
      m.match_date,
      m.recorded_by,
      m.created_at,
      m.event_id,
      m.tournament_id,
      m.elo_processed,
      COALESCE(
        (SELECT jsonb_agg(item) FROM (
          SELECT 
            mp.id,
            mp.match_id,
            mp.user_id,
            mp.team,
            mp.is_guest,
            mp.guest_name,
            COALESCE(p.display_name, p.name, mp.guest_name, 'Guest') AS name,
            CASE WHEN p.id IS NOT NULL THEN jsonb_build_object('id', p.id, 'name', p.name, 'display_name', p.display_name, 'avatar_url', p.avatar_url) ELSE NULL END AS profile
          FROM public.match_participants mp
          LEFT JOIN public.profiles p ON p.id = mp.user_id
          WHERE mp.match_id = m.id
        ) participant_items),
        '[]'::jsonb
      ) AS participants,
      COALESCE(
        (SELECT jsonb_agg(item) FROM (
          SELECT 
            ss.id,
            ss.match_id,
            ss.set_number,
            ss.team1_score,
            ss.team2_score
          FROM public.score_sets ss
          WHERE ss.match_id = m.id
          ORDER BY ss.set_number ASC
        ) set_items),
        '[]'::jsonb
      ) AS score_sets,
      COALESCE(
        (SELECT jsonb_agg(item) FROM (
          SELECT 
            mr.id,
            mr.match_id,
            mr.user_id,
            mr.reaction,
            mr.created_at,
            COALESCE(p.name, 'Member') AS name,
            COALESCE(p.display_name, p.name, 'Member') AS display_name
          FROM public.match_reactions mr
          LEFT JOIN public.profiles p ON p.id = mr.user_id
          WHERE mr.match_id = m.id
        ) reaction_items),
        '[]'::jsonb
      ) AS reactions,
      COALESCE(
        (SELECT jsonb_agg(item) FROM (
          SELECT 
            mc.id,
            mc.match_id,
            mc.user_id,
            mc.content,
            mc.created_at,
            COALESCE(p.name, 'Member') AS name,
            COALESCE(p.display_name, p.name, 'Member') AS display_name,
            p.avatar_url
          FROM public.match_comments mc
          LEFT JOIN public.profiles p ON p.id = mc.user_id
          WHERE mc.match_id = m.id
          ORDER BY mc.created_at ASC
        ) comment_items),
        '[]'::jsonb
      ) AS comments,
      (
        SELECT jsonb_build_object('name', p.name, 'display_name', p.display_name)
        FROM public.profiles p
        WHERE p.id = m.recorded_by
      ) AS recorded_by_profile
    FROM public.matches m
    JOIN public.clubs c ON c.id = m.club_id
    WHERE m.id IN (SELECT match_id FROM player_match_ids)
      -- Filter by visibility: show if club is public OR caller is player OR caller is member of the club
      AND (
        c.is_private = false
        OR auth.uid() = p_user_id
        OR (auth.uid() IS NOT NULL AND private.is_active_club_member(m.club_id))
      )
    ORDER BY m.match_date DESC, m.created_at DESC
    LIMIT p_limit
  )
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object(
      'id', md.id,
      'club_id', md.club_id,
      'clubName', md."clubName",
      'title', md.title,
      'sport', md.sport,
      'match_type', md.match_type,
      'match_date', md.match_date,
      'recorded_by', md.recorded_by,
      'created_at', md.created_at,
      'event_id', md.event_id,
      'tournament_id', md.tournament_id,
      'elo_processed', md.elo_processed,
      'participants', md.participants,
      'score_sets', md.score_sets,
      'reactions', md.reactions,
      'comments', md.comments,
      'recorded_by_profile', md.recorded_by_profile
    )),
    '[]'::jsonb
  ) INTO v_result
  FROM match_details md;

  RETURN v_result;
END;
$$;

-- 5. Update get_player_dashboard RPC with caller membership/privacy constraints
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

  -- 1. Fetch Clubs (only list clubs caller is authorized to view)
  WITH club_ranks AS (
    SELECT
      m.club_id,
      m.user_id,
      CASE WHEN p.doubles_games > p.singles_games THEN p.doubles_elo ELSE p.singles_elo END AS user_elo,
      ROW_NUMBER() OVER(
        PARTITION BY m.club_id
        ORDER BY
          CASE WHEN p.doubles_games > p.singles_games THEN p.doubles_elo ELSE p.singles_elo END DESC,
          m.joined_at ASC
      )::INTEGER AS rank_pos,
      COUNT(*) OVER(PARTITION BY m.club_id)::INTEGER AS total_ranked
    FROM public.memberships m
    JOIN public.profiles p ON p.id = m.user_id
    JOIN public.clubs c ON c.id = m.club_id
    WHERE m.status = 'active'
      AND (c.is_private = false OR auth.uid() = m.user_id OR (auth.uid() IS NOT NULL AND private.is_active_club_member(c.id)))
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
      ROUND(AVG(CASE WHEN p.doubles_games > p.singles_games THEN p.doubles_elo ELSE p.singles_elo END))::INTEGER AS avg_elo
    FROM public.memberships m
    JOIN public.profiles p ON p.id = m.user_id
    JOIN public.clubs c ON c.id = m.club_id
    WHERE m.status = 'active'
      AND (c.is_private = false OR auth.uid() = m.user_id OR (auth.uid() IS NOT NULL AND private.is_active_club_member(c.id)))
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
      p.doubles_elo,
      p.singles_games,
      p.doubles_games,
      cr.rank_pos,
      cr.total_ranked,
      COALESCE(cms.members_count, 0) AS members_count,
      COALESCE(cms.avg_elo, 1200) AS avg_elo
    FROM public.memberships m
    JOIN public.clubs c ON c.id = m.club_id
    JOIN public.profiles p ON p.id = m.user_id
    LEFT JOIN club_member_stats cms ON cms.club_id = c.id
    LEFT JOIN club_ranks cr ON cr.club_id = c.id AND cr.user_id = p_user_id
    WHERE m.user_id = p_user_id 
      AND m.status = 'active'
      AND (c.is_private = false OR auth.uid() = p_user_id OR (auth.uid() IS NOT NULL AND private.is_active_club_member(c.id)))
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
      'doubles_elo', cd.doubles_elo,
      'singles_games', cd.singles_games,
      'doubles_games', cd.doubles_games,
      'rank', jsonb_build_object('rank', cd.rank_pos, 'total', cd.total_ranked),
      'members_count', cd.members_count,
      'avg_elo', cd.avg_elo
    )
  ), '[]'::jsonb) INTO v_clubs
  FROM club_data cd;

  -- 2. Fetch Upcoming Events across joined clubs (filtered by caller visibility)
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
      AND (c.is_private = false OR auth.uid() = p_user_id OR (auth.uid() IS NOT NULL AND private.is_active_club_member(c.id)))
      AND e.event_date >= NOW()
      ORDER BY e.event_date ASC
    ) subq),
    '[]'::jsonb
  ) INTO v_events;

  -- 3. Fetch Recent Matches where the player participated and the caller has read access
  WITH recent_match_ids AS (
    SELECT m.id
    FROM public.matches m
    JOIN public.match_participants mp ON mp.match_id = m.id
    JOIN public.clubs c ON c.id = m.club_id
    WHERE mp.user_id = p_user_id
      AND m.club_id IN (
        SELECT club_id FROM public.memberships WHERE user_id = p_user_id AND status = 'active'
      )
      AND (c.is_private = false OR auth.uid() = p_user_id OR (auth.uid() IS NOT NULL AND private.is_active_club_member(c.id)))
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

  -- 4. Calculate Personal Stats (filtering out private matches caller has no access to)
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
      JOIN public.clubs c ON c.id = m.club_id
      WHERE (c.is_private = false OR auth.uid() = p_user_id OR (auth.uid() IS NOT NULL AND private.is_active_club_member(c.id)))
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

  -- 5. Calculate Achievements (checking caller visibility)
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
    JOIN public.clubs c ON c.id = m.club_id
    WHERE ((mp.team = 1 AND ss.team1_score - ss.team2_score >= 10) OR
          (mp.team = 2 AND ss.team2_score - ss.team1_score >= 10))
      AND (c.is_private = false OR auth.uid() = p_user_id OR (auth.uid() IS NOT NULL AND private.is_active_club_member(c.id)))
  ) INTO v_ach_clean_sweep;

  -- 5.3 Iron Man (Play 3+ matches in 1 day)
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT COALESCE(m.match_date, m.created_at::date) AS m_date, COUNT(*) AS match_count
      FROM public.matches m
      JOIN public.match_participants mp ON mp.match_id = m.id AND mp.user_id = p_user_id
      JOIN public.clubs c ON c.id = m.club_id
      WHERE (c.is_private = false OR auth.uid() = p_user_id OR (auth.uid() IS NOT NULL AND private.is_active_club_member(c.id)))
      GROUP BY m_date
    ) d
    WHERE d.match_count >= 3
  ) INTO v_ach_iron_man;

  -- 5.4 Dynamic Duo (3+ doubles win streak with same partner)
  DECLARE
    r_doubles RECORD;
    v_win BOOLEAN;
    v_prev_partner UUID := NULL;
    v_prev_partner_guest TEXT := NULL;
    v_partner_streak INTEGER := 0;
  BEGIN
    FOR r_doubles IN (
      SELECT
        m.id,
        mp1.team AS user_team,
        mp2.user_id AS partner_id,
        mp2.guest_name AS partner_guest,
        (SELECT COUNT(*)::INTEGER FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team1_score > ss.team2_score) AS team1_sets,
        (SELECT COUNT(*)::INTEGER FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team2_score > ss.team1_score) AS team2_sets
      FROM public.matches m
      JOIN public.match_participants mp1 ON mp1.match_id = m.id AND mp1.user_id = p_user_id
      JOIN public.match_participants mp2 ON mp2.match_id = m.id AND mp2.user_id != p_user_id AND mp2.team = mp1.team
      JOIN public.clubs c ON c.id = m.club_id
      WHERE m.match_type = 'doubles'
        AND (c.is_private = false OR auth.uid() = p_user_id OR (auth.uid() IS NOT NULL AND private.is_active_club_member(c.id)))
      ORDER BY m.match_date DESC, m.created_at DESC
    ) LOOP
      IF r_doubles.team1_sets = r_doubles.team2_sets THEN
        CONTINUE;
      END IF;

      v_win := (r_doubles.team1_sets > r_doubles.team2_sets AND r_doubles.user_team = 1) OR
               (r_doubles.team2_sets > r_doubles.team1_sets AND r_doubles.user_team = 2);

      IF NOT v_win THEN
        EXIT; -- streak broken
      END IF;

      IF v_prev_partner IS NULL AND v_prev_partner_guest IS NULL THEN
        v_prev_partner := r_doubles.partner_id;
        v_prev_partner_guest := r_doubles.partner_guest;
        v_partner_streak := 1;
      ELSIF (r_doubles.partner_id IS NOT NULL AND r_doubles.partner_id = v_prev_partner) OR
            (r_doubles.partner_guest IS NOT NULL AND r_doubles.partner_guest = v_prev_partner_guest) THEN
        v_partner_streak := v_partner_streak + 1;
      ELSE
        EXIT; -- partner changed
      END IF;
    END LOOP;

    IF v_partner_streak >= 3 THEN
      v_ach_dynamic_duo := TRUE;
    END IF;
  END;

  -- 5.5 Giant Slayer (Win against someone rated 150+ ELO higher)
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.match_participants mp ON mp.match_id = m.id AND mp.user_id = p_user_id
    JOIN public.clubs c ON c.id = m.club_id
    JOIN public.elo_history_global eh ON eh.match_id = m.id AND eh.profile_id = p_user_id
    WHERE (c.is_private = false OR auth.uid() = p_user_id OR (auth.uid() IS NOT NULL AND private.is_active_club_member(c.id)))
      AND eh.delta > 0
      AND eh.opponent_rating_avg - eh.elo_before >= 150
  ) INTO v_ach_giant_slayer;

  v_achievements := jsonb_build_object(
    'onFire', v_ach_on_fire,
    'cleanSweep', v_ach_clean_sweep,
    'ironMan', v_ach_iron_man,
    'dynamicDuo', v_ach_dynamic_duo,
    'giantSlayer', v_ach_giant_slayer
  );

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

-- 6. Update get_club_leaderboard RPC with privacy checks and allow anon/public executions
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_private BOOLEAN;
BEGIN
  -- Check privacy status of target club
  SELECT is_private INTO v_is_private FROM public.clubs WHERE id = target_club_id;
  
  -- If private, restrict to club members
  IF v_is_private = true AND (auth.uid() IS NULL OR NOT private.is_active_club_member(target_club_id)) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH eligible_matches AS (
    SELECT DISTINCT m.id
    FROM matches m
    WHERE m.club_id = target_club_id
       OR EXISTS (
         SELECT 1
         FROM competition_clubs cc
         WHERE cc.competition_id = m.tournament_id
           AND cc.club_id = target_club_id
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
      AND m.match_type = match_type_filter
  ),
  player_stats AS (
    SELECT
      mp_matches.user_id,
      COUNT(*)::INTEGER AS games,
      SUM(is_win)::INTEGER AS wins,
      (COUNT(*) - SUM(is_win))::INTEGER AS losses
    FROM player_matches mp_matches
    GROUP BY mp_matches.user_id
  ),
  ranked AS (
    SELECT
      p.id AS ranked_user_id,
      COALESCE(p.display_name, p.name) AS ranked_name,
      CASE WHEN match_type_filter = 'doubles' THEN p.doubles_elo ELSE p.singles_elo END AS ranked_elo,
      COALESCE(ps.games, 0)::INTEGER AS ranked_games,
      COALESCE(ps.wins, 0)::INTEGER AS ranked_wins,
      COALESCE(ps.losses, 0)::INTEGER AS ranked_losses,
      CASE WHEN COALESCE(ps.games, 0) > 0
        THEN ROUND((ps.wins::NUMERIC / ps.games) * 100, 0)
        ELSE 0
      END AS ranked_win_percentage
    FROM profiles p
    LEFT JOIN player_stats ps ON ps.user_id = p.id
    WHERE p.id IN (
      SELECT user_id
      FROM memberships
      WHERE club_id = target_club_id
        AND status = 'active'
    )
      AND COALESCE(ps.games, 0) > 0
  )
  SELECT
    ranked.ranked_user_id,
    ranked.ranked_name,
    ranked.ranked_elo,
    ranked.ranked_games,
    ranked.ranked_wins,
    ranked.ranked_losses,
    ranked.ranked_win_percentage,
    ROW_NUMBER() OVER (
      ORDER BY ranked.ranked_elo DESC, ranked.ranked_win_percentage DESC, ranked.ranked_wins DESC, ranked.ranked_name ASC
    ) AS rank
  FROM ranked
  ORDER BY rank
  LIMIT row_limit;
END;
$$;

-- Allow anon and authenticated to execute get_club_leaderboard (privacy is handled inside function logic)
GRANT EXECUTE ON FUNCTION public.get_club_leaderboard(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_leaderboard(UUID, INTEGER, TEXT) TO anon;
