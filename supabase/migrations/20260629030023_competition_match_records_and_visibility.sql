-- Let every confirmed club in a competition see the shared match record.
-- Competition matches are stored once in public.matches and linked through
-- matches.tournament_id, so opponent clubs need read access without duplicating
-- rows and double-processing Elo.

DROP POLICY IF EXISTS "Competition club members can view shared matches" ON public.matches;
CREATE POLICY "Competition club members can view shared matches"
  ON public.matches FOR SELECT TO authenticated
  USING (
    tournament_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.competition_clubs cc
      JOIN public.memberships m ON m.club_id = cc.club_id
      WHERE cc.competition_id = matches.tournament_id
        AND cc.status = 'confirmed'
        AND m.user_id = (select auth.uid())
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Competition club members can view shared match participants" ON public.match_participants;
CREATE POLICY "Competition club members can view shared match participants"
  ON public.match_participants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches ma
      JOIN public.competition_clubs cc ON cc.competition_id = ma.tournament_id
      JOIN public.memberships m ON m.club_id = cc.club_id
      WHERE ma.id = match_participants.match_id
        AND cc.status = 'confirmed'
        AND m.user_id = (select auth.uid())
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Competition club members can view shared score sets" ON public.score_sets;
CREATE POLICY "Competition club members can view shared score sets"
  ON public.score_sets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches ma
      JOIN public.competition_clubs cc ON cc.competition_id = ma.tournament_id
      JOIN public.memberships m ON m.club_id = cc.club_id
      WHERE ma.id = score_sets.match_id
        AND cc.status = 'confirmed'
        AND m.user_id = (select auth.uid())
        AND m.status = 'active'
    )
  );

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
      CASE WHEN match_type_filter = 'doubles' THEN p.doubles_elo ELSE p.singles_elo END AS elo,
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
      WHERE club_id = target_club_id
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
  ORDER BY rank
  LIMIT row_limit;
$$;

REVOKE ALL ON FUNCTION public.get_club_leaderboard(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_club_leaderboard(UUID, INTEGER, TEXT) TO authenticated;
