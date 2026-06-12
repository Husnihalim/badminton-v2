-- Migration: Fix get_player_dashboard RPC to only include player's own matches in recent_matches
-- Created: 2026-06-12

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

  -- 1. Fetch Clubs
  WITH club_member_stats AS (
    SELECT
      club_id,
      COUNT(*)::INTEGER AS members_count,
      ROUND(AVG(elo_rating))::INTEGER AS avg_elo
    FROM public.memberships
    WHERE status = 'active'
    GROUP BY club_id
  ),
  club_ranks AS (
    SELECT
      m.club_id,
      m.user_id,
      m.elo_rating AS user_elo,
      ROW_NUMBER() OVER(PARTITION BY m.club_id ORDER BY m.elo_rating DESC, m.joined_at ASC)::INTEGER AS rank_pos,
      COUNT(*) OVER(PARTITION BY m.club_id)::INTEGER AS total_ranked
    FROM public.memberships m
    WHERE m.status = 'active'
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
      m.elo_rating,
      cr.rank_pos,
      cr.total_ranked,
      COALESCE(cms.members_count, 0) AS members_count,
      COALESCE(cms.avg_elo, 1200) AS avg_elo
    FROM public.memberships m
    JOIN public.clubs c ON c.id = m.club_id
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
      'elo_rating', cd.elo_rating,
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

  -- 5.5 Giant Slayer (Beat an opponent who has a higher ELO rating)
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.match_participants mp_user ON mp_user.match_id = m.id AND mp_user.user_id = p_user_id
    JOIN public.match_participants mp_opp ON mp_opp.match_id = m.id AND mp_opp.team <> mp_user.team
    JOIN public.memberships mem_user ON mem_user.club_id = m.club_id AND mem_user.user_id = p_user_id
    JOIN public.memberships mem_opp ON mem_opp.club_id = m.club_id AND mem_opp.user_id = mp_opp.user_id
    WHERE
      (((SELECT COUNT(*) FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team1_score > ss.team2_score) >
        (SELECT COUNT(*) FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team2_score > ss.team1_score) AND mp_user.team = 1) OR
       ((SELECT COUNT(*) FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team2_score > ss.team1_score) >
        (SELECT COUNT(*) FROM public.score_sets ss WHERE ss.match_id = m.id AND ss.team1_score > ss.team2_score) AND mp_user.team = 2))
      AND mem_opp.elo_rating > mem_user.elo_rating
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
