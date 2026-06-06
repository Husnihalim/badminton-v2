-- Allow a user who was already auto-joined during signup to revisit the same
-- one-use specific invite link without seeing "already used".
DROP FUNCTION IF EXISTS public.join_club_by_invite_code(TEXT);

CREATE FUNCTION public.join_club_by_invite_code(invite_code_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  normalized_token TEXT := upper(trim(invite_code_input));
  target_club public.clubs;
  specific_invite public.club_specific_invites;
  existing_membership public.memberships;
  new_membership public.memberships;
  existing_request public.join_requests;
  new_request public.join_requests;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to use an invite link';
  END IF;

  SELECT *
  INTO specific_invite
  FROM public.club_specific_invites
  WHERE token = normalized_token
  FOR UPDATE;

  IF specific_invite.id IS NOT NULL THEN
    SELECT *
    INTO existing_membership
    FROM public.memberships
    WHERE club_id = specific_invite.club_id
      AND user_id = current_user_id
    FOR UPDATE;

    IF existing_membership.id IS NOT NULL AND existing_membership.status = 'active' THEN
      RETURN jsonb_build_object(
        'status', 'active',
        'club_id', existing_membership.club_id,
        'membership_id', existing_membership.id
      );
    END IF;

    IF specific_invite.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'This specific invite has been revoked';
    END IF;

    IF specific_invite.expires_at IS NOT NULL AND specific_invite.expires_at < NOW() THEN
      RAISE EXCEPTION 'This specific invite has expired';
    END IF;

    IF specific_invite.used_count >= specific_invite.max_uses THEN
      RAISE EXCEPTION 'This specific invite has already been used';
    END IF;

    IF existing_membership.id IS NOT NULL THEN
      UPDATE public.memberships
      SET status = 'active',
          role = CASE WHEN memberships.role = 'owner' THEN memberships.role ELSE 'member' END,
          approved_by = specific_invite.created_by,
          updated_at = NOW()
      WHERE id = existing_membership.id
      RETURNING * INTO new_membership;
    ELSE
      INSERT INTO public.memberships (club_id, user_id, role, status, approved_by)
      VALUES (specific_invite.club_id, current_user_id, 'member', 'active', specific_invite.created_by)
      RETURNING * INTO new_membership;
    END IF;

    UPDATE public.club_specific_invites
    SET used_count = used_count + 1
    WHERE id = specific_invite.id;

    RETURN jsonb_build_object(
      'status', 'active',
      'club_id', new_membership.club_id,
      'membership_id', new_membership.id
    );
  END IF;

  SELECT *
  INTO target_club
  FROM public.clubs
  WHERE invite_code = normalized_token;

  IF target_club.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT *
  INTO existing_membership
  FROM public.memberships
  WHERE club_id = target_club.id
    AND user_id = current_user_id;

  IF existing_membership.id IS NOT NULL AND existing_membership.status = 'active' THEN
    RETURN jsonb_build_object(
      'status', 'active',
      'club_id', existing_membership.club_id,
      'membership_id', existing_membership.id
    );
  END IF;

  SELECT *
  INTO existing_request
  FROM public.join_requests
  WHERE club_id = target_club.id
    AND user_id = current_user_id;

  IF existing_request.id IS NOT NULL THEN
    IF existing_request.status = 'pending' THEN
      RETURN jsonb_build_object(
        'status', 'pending',
        'club_id', existing_request.club_id,
        'join_request_id', existing_request.id
      );
    END IF;

    UPDATE public.join_requests
    SET status = 'pending',
        updated_at = NOW()
    WHERE id = existing_request.id
    RETURNING * INTO new_request;
  ELSE
    INSERT INTO public.join_requests (club_id, user_id, status)
    VALUES (target_club.id, current_user_id, 'pending')
    RETURNING * INTO new_request;
  END IF;

  RETURN jsonb_build_object(
    'status', 'pending',
    'club_id', new_request.club_id,
    'join_request_id', new_request.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_club_by_invite_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_club_by_invite_code(TEXT) TO authenticated;
