-- Safely join a club by invite code from the browser.
-- The function validates the invite code server-side, then inserts only the
-- authenticated user's own member row.

DROP POLICY IF EXISTS "Users can join open clubs" ON memberships;

CREATE POLICY "Users can join open clubs"
    ON memberships FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND role = 'member'
      AND status = 'active'
      AND EXISTS (
        SELECT 1
        FROM clubs
        WHERE clubs.id = memberships.club_id
          AND clubs.open_join = TRUE
          AND clubs.approval_required = FALSE
      )
    );

CREATE OR REPLACE FUNCTION public.join_club_by_invite_code(invite_code_input TEXT)
RETURNS memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_club clubs;
  existing_membership memberships;
  new_membership memberships;
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to join a club';
  END IF;

  SELECT *
  INTO target_club
  FROM clubs
  WHERE invite_code = UPPER(TRIM(invite_code_input));

  IF target_club.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT *
  INTO existing_membership
  FROM memberships
  WHERE club_id = target_club.id
    AND user_id = current_user_id;

  IF existing_membership.id IS NOT NULL THEN
    IF existing_membership.status = 'active' THEN
      RAISE EXCEPTION 'You are already a member of this club';
    END IF;

    UPDATE memberships
    SET status = 'active',
        role = 'member',
        approved_by = target_club.owner_id
    WHERE id = existing_membership.id
    RETURNING * INTO new_membership;

    RETURN new_membership;
  END IF;

  INSERT INTO memberships (club_id, user_id, role, status, approved_by)
  VALUES (target_club.id, current_user_id, 'member', 'active', target_club.owner_id)
  RETURNING * INTO new_membership;

  RETURN new_membership;
END;
$$;

REVOKE ALL ON FUNCTION public.join_club_by_invite_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_club_by_invite_code(TEXT) TO authenticated;
