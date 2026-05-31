-- Fix recursive memberships RLS policies.
-- Policies that query memberships from inside a memberships policy cause
-- "infinite recursion detected in policy for relation memberships".

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_active_club_member(target_club_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM memberships
    WHERE club_id = target_club_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_club_admin(target_club_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM memberships
    WHERE club_id = target_club_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_club_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_club_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_active_club_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_club_admin(UUID) TO authenticated;

DROP POLICY IF EXISTS "Memberships viewable by club members" ON memberships;
DROP POLICY IF EXISTS "Memberships can be created by club admins" ON memberships;
DROP POLICY IF EXISTS "Memberships can be created by club admins or for join requests" ON memberships;
DROP POLICY IF EXISTS "Memberships can be updated by club admins" ON memberships;

CREATE POLICY "Users can view own membership or club members"
    ON memberships FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR private.is_active_club_member(club_id));

CREATE POLICY "Club admins can create memberships"
    ON memberships FOR INSERT
    TO authenticated
    WITH CHECK (private.is_club_admin(club_id));

CREATE POLICY "Club admins can update memberships"
    ON memberships FOR UPDATE
    TO authenticated
    USING (private.is_club_admin(club_id))
    WITH CHECK (private.is_club_admin(club_id));
