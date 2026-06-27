-- Fix competition creation after the friendlies/leagues redesign.
--
-- The redesign introduced competition_clubs, but the initial policy only
-- allowed admins to manage their own club row. Creating a competition needs
-- the host admin to add invited opponent rows too. These helpers centralize
-- the membership checks and avoid recursive RLS lookups between competitions
-- and competition_clubs policies.

CREATE OR REPLACE FUNCTION public.is_competition_member(p_competition_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM competitions c
    JOIN memberships m ON m.club_id = c.club_id
    WHERE c.id = p_competition_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
  OR EXISTS (
    SELECT 1
    FROM competition_clubs cc
    JOIN memberships m ON m.club_id = cc.club_id
    WHERE cc.competition_id = p_competition_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_competition_admin(p_competition_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM competitions c
    JOIN memberships m ON m.club_id = c.club_id
    WHERE c.id = p_competition_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
      AND m.status = 'active'
  )
  OR EXISTS (
    SELECT 1
    FROM competition_clubs cc
    JOIN memberships m ON m.club_id = cc.club_id
    WHERE cc.competition_id = p_competition_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
      AND m.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_competition_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_competition_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_competition_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_competition_admin(UUID) TO authenticated;

DROP POLICY IF EXISTS "Competitions viewable by participating club members" ON competitions;
CREATE POLICY "Competitions viewable by participating club members"
  ON competitions FOR SELECT
  USING (public.is_competition_member(id));

DROP POLICY IF EXISTS "Club owners/admins can update their competitions" ON competitions;
CREATE POLICY "Club owners/admins can update their competitions"
  ON competitions FOR UPDATE
  USING (public.is_competition_admin(id))
  WITH CHECK (public.is_competition_admin(id));

DROP POLICY IF EXISTS "Competition clubs viewable by participating clubs members" ON competition_clubs;
CREATE POLICY "Competition clubs viewable by participating clubs members"
  ON competition_clubs FOR SELECT
  USING (public.is_competition_member(competition_id));

DROP POLICY IF EXISTS "Club owners/admins can manage their competition entry" ON competition_clubs;
CREATE POLICY "Club owners/admins can insert competition club entries"
  ON competition_clubs FOR INSERT
  WITH CHECK (public.is_competition_admin(competition_id));

CREATE POLICY "Club owners/admins can update competition club entries"
  ON competition_clubs FOR UPDATE
  USING (public.is_competition_admin(competition_id))
  WITH CHECK (public.is_competition_admin(competition_id));

CREATE POLICY "Club owners/admins can delete competition club entries"
  ON competition_clubs FOR DELETE
  USING (public.is_competition_admin(competition_id));
