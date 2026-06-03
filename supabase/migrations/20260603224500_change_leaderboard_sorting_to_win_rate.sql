-- Update leaderboard metrics sorting to be based on win percentage first, then points, wins, and name.

DROP FUNCTION IF EXISTS public.get_club_leaderboard(UUID, INTEGER);

CREATE FUNCTION public.get_club_leaderboard(
  target_club_id UUID,
  row_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  name TEXT,
  games INTEGER,
  wins INTEGER,
  losses INTEGER,
  win_percentage NUMERIC,
  points_for INTEGER,
  points_against INTEGER,
  points INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH match_scores AS (
    SELECT
      m.id AS match_id,
      SUM(ss.team1_score) AS team1_points,
      SUM(ss.team2_score) AS team2_points,
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
      END AS winning_team,
      team1_points,
      team2_points
    FROM match_scores
  ),
  player_results AS (
    SELECT
      COALESCE(p.display_name, p.name, mp.guest_name, 'Unknown') AS player_name,
      CASE WHEN mp.team = dm.winning_team THEN 1 ELSE 0 END AS win_count,
      CASE WHEN dm.winning_team IS NOT NULL AND mp.team <> dm.winning_team THEN 1 ELSE 0 END AS loss_count,
      CASE WHEN dm.winning_team IS NOT NULL THEN 1 ELSE 0 END AS game_count,
      CASE WHEN mp.team = 1 THEN dm.team1_points ELSE dm.team2_points END AS points_for,
      CASE WHEN mp.team = 1 THEN dm.team2_points ELSE dm.team1_points END AS points_against
    FROM decided_matches dm
    JOIN match_participants mp ON mp.match_id = dm.match_id
    LEFT JOIN profiles p ON p.id = mp.user_id
  )
  SELECT
    player_name AS name,
    SUM(game_count)::INTEGER AS games,
    SUM(win_count)::INTEGER AS wins,
    SUM(loss_count)::INTEGER AS losses,
    CASE WHEN SUM(game_count) > 0 THEN ROUND(SUM(win_count)::NUMERIC / SUM(game_count) * 100, 0) ELSE 0 END AS win_percentage,
    SUM(points_for)::INTEGER AS points_for,
    SUM(points_against)::INTEGER AS points_against,
    SUM(points_for - points_against)::INTEGER AS points
  FROM player_results
  GROUP BY player_name
  ORDER BY win_percentage DESC, points DESC, wins DESC, name ASC
$$;

REVOKE ALL ON FUNCTION public.get_club_leaderboard(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_club_leaderboard(UUID, INTEGER) TO authenticated;
