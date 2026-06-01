-- Leaderboard helper calculated from all valid club matches.

CREATE OR REPLACE FUNCTION public.get_club_leaderboard(
  target_club_id UUID,
  row_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  name TEXT,
  wins INTEGER,
  losses INTEGER,
  points INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH match_set_results AS (
    SELECT
      m.id AS match_id,
      SUM(CASE WHEN ss.team1_score > ss.team2_score THEN 1 ELSE 0 END) AS team1_sets,
      SUM(CASE WHEN ss.team2_score > ss.team1_score THEN 1 ELSE 0 END) AS team2_sets
    FROM matches m
    JOIN score_sets ss ON ss.match_id = m.id
    WHERE m.club_id = target_club_id
    GROUP BY m.id
  ),
  decided_matches AS (
    SELECT
      match_id,
      CASE
        WHEN team1_sets > team2_sets THEN 1
        WHEN team2_sets > team1_sets THEN 2
        ELSE NULL
      END AS winning_team
    FROM match_set_results
  ),
  player_results AS (
    SELECT
      COALESCE(p.display_name, p.name, mp.guest_name, 'Unknown') AS player_name,
      CASE WHEN mp.team = dm.winning_team THEN 1 ELSE 0 END AS win_count,
      CASE WHEN mp.team <> dm.winning_team THEN 1 ELSE 0 END AS loss_count
    FROM decided_matches dm
    JOIN match_participants mp ON mp.match_id = dm.match_id
    LEFT JOIN profiles p ON p.id = mp.user_id
    WHERE dm.winning_team IS NOT NULL
  )
  SELECT
    player_name AS name,
    SUM(win_count)::INTEGER AS wins,
    SUM(loss_count)::INTEGER AS losses,
    (SUM(win_count) * 3)::INTEGER AS points
  FROM player_results
  GROUP BY player_name
  ORDER BY points DESC, wins DESC, losses ASC, player_name ASC
  LIMIT GREATEST(row_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.get_club_leaderboard(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_club_leaderboard(UUID, INTEGER) TO authenticated;
