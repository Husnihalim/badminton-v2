-- Migration: Restrict profile visibility to self, same club members, or superadmins
-- Created: 2026-06-04

CREATE OR REPLACE FUNCTION private.share_any_club(user_id_1 UUID, user_id_2 UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM memberships m1
    JOIN memberships m2 ON m2.club_id = m1.club_id
    WHERE m1.user_id = user_id_1
      AND m1.status = 'active'
      AND m2.user_id = user_id_2
      AND m2.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION private.share_any_club(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.share_any_club(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by self, same club members, or superadmins"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR private.share_any_club(auth.uid(), id)
    OR private.is_platform_superadmin()
  );
