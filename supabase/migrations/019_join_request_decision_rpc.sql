-- Make join request decisions atomic and server-authorized.

CREATE OR REPLACE FUNCTION public.approve_join_request(target_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_request join_requests;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  SELECT *
  INTO target_request
  FROM join_requests
  WHERE id = target_request_id
  FOR UPDATE;

  IF target_request.id IS NULL THEN
    RAISE EXCEPTION 'Join request not found';
  END IF;

  IF target_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Join request has already been decided';
  END IF;

  IF NOT private.is_club_admin(target_request.club_id) THEN
    RAISE EXCEPTION 'Only club admins can approve join requests';
  END IF;

  INSERT INTO memberships (club_id, user_id, role, status, approved_by)
  VALUES (
    target_request.club_id,
    target_request.user_id,
    'member',
    'active',
    current_user_id
  )
  ON CONFLICT (club_id, user_id)
  DO UPDATE SET
    role = 'member',
    status = 'active',
    approved_by = EXCLUDED.approved_by,
    updated_at = NOW();

  UPDATE join_requests
  SET status = 'approved',
      updated_at = NOW()
  WHERE id = target_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_join_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_join_request(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_join_request(target_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_request join_requests;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  SELECT *
  INTO target_request
  FROM join_requests
  WHERE id = target_request_id
  FOR UPDATE;

  IF target_request.id IS NULL THEN
    RAISE EXCEPTION 'Join request not found';
  END IF;

  IF target_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Join request has already been decided';
  END IF;

  IF NOT private.is_club_admin(target_request.club_id) THEN
    RAISE EXCEPTION 'Only club admins can reject join requests';
  END IF;

  UPDATE join_requests
  SET status = 'rejected',
      updated_at = NOW()
  WHERE id = target_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_join_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_join_request(UUID) TO authenticated;
