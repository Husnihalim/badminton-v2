-- Migration: Create get_player_matches database RPC for optimized user profile and dashboard fetching
-- Created: 2026-06-30

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
      ) AS score_sets,
      COALESCE(
        (SELECT jsonb_agg(item) FROM (
          SELECT jsonb_build_object(
            'id', mr.id,
            'match_id', mr.match_id,
            'user_id', mr.user_id,
            'reaction', mr.reaction,
            'created_at', mr.created_at,
            'name', COALESCE(p.name, 'Member'),
            'display_name', COALESCE(p.display_name, p.name, 'Member')
          ) AS item
          FROM public.match_reactions mr
          LEFT JOIN public.profiles p ON p.id = mr.user_id
          WHERE mr.match_id = m.id
        ) reaction_items),
        '[]'::jsonb
      ) AS reactions,
      COALESCE(
        (SELECT jsonb_agg(item) FROM (
          SELECT jsonb_build_object(
            'id', mc.id,
            'match_id', mc.match_id,
            'user_id', mc.user_id,
            'content', mc.content,
            'created_at', mc.created_at,
            'name', COALESCE(p.name, 'Member'),
            'display_name', COALESCE(p.display_name, p.name, 'Member'),
            'avatar_url', p.avatar_url
          ) AS item
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

-- Secure function execution
REVOKE ALL ON FUNCTION public.get_player_matches(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_player_matches(UUID, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_player_matches(UUID, INTEGER) TO authenticated;
