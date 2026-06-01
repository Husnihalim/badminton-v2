-- Remove members through a verified server-side path.
-- Direct deletes can be blocked by RLS without a useful browser-side signal.

CREATE OR REPLACE FUNCTION public.remove_club_member(
  target_club_id UUID,
  target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_membership memberships;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'You cannot remove yourself from the club';
  END IF;

  IF NOT private.is_club_admin(target_club_id) THEN
    RAISE EXCEPTION 'Only club admins can remove members';
  END IF;

  SELECT *
  INTO target_membership
  FROM memberships
  WHERE club_id = target_club_id
    AND user_id = target_user_id
    AND status = 'active';

  IF target_membership.id IS NULL THEN
    RAISE EXCEPTION 'Active membership not found';
  END IF;

  IF target_membership.role = 'owner' THEN
    RAISE EXCEPTION 'Club owners cannot be removed';
  END IF;

  UPDATE memberships
  SET status = 'inactive',
      role = 'member',
      updated_at = NOW()
  WHERE id = target_membership.id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_club_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_club_member(UUID, UUID) TO authenticated;
