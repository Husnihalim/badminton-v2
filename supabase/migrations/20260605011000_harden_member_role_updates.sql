-- Harden member role changes behind a narrow server-side function.
-- Club admins can manage members, but only owners or platform superadmins can
-- promote/demote admins. Owners cannot be demoted through this path.

DROP POLICY IF EXISTS "Club admins can update memberships" ON public.memberships;

CREATE POLICY "Club admins can update member status"
  ON public.memberships FOR UPDATE
  TO authenticated
  USING (
    private.is_club_admin(club_id)
    AND role = 'member'
  )
  WITH CHECK (
    private.is_club_admin(club_id)
    AND role = 'member'
  );

CREATE OR REPLACE FUNCTION public.update_member_role(
  target_club_id UUID,
  target_user_id UUID,
  new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  actor_membership public.memberships;
  target_membership public.memberships;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  IF new_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT *
  INTO target_membership
  FROM public.memberships
  WHERE club_id = target_club_id
    AND user_id = target_user_id
    AND status = 'active'
  FOR UPDATE;

  IF target_membership.id IS NULL THEN
    RAISE EXCEPTION 'Active membership not found';
  END IF;

  IF target_membership.role = 'owner' THEN
    RAISE EXCEPTION 'Club owners cannot be demoted or reassigned';
  END IF;

  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'You cannot change your own club role';
  END IF;

  IF NOT private.is_platform_superadmin() THEN
    SELECT *
    INTO actor_membership
    FROM public.memberships
    WHERE club_id = target_club_id
      AND user_id = current_user_id
      AND status = 'active';

    IF actor_membership.id IS NULL OR actor_membership.role <> 'owner' THEN
      RAISE EXCEPTION 'Only club owners can change admin roles';
    END IF;
  END IF;

  UPDATE public.memberships
  SET role = new_role,
      updated_at = NOW()
  WHERE id = target_membership.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_join_request(target_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_request public.join_requests;
  target_email_confirmed_at TIMESTAMPTZ;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  SELECT *
  INTO target_request
  FROM public.join_requests
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

  SELECT email_confirmed_at
  INTO target_email_confirmed_at
  FROM auth.users
  WHERE id = target_request.user_id;

  IF target_email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'This member must verify their email before approval';
  END IF;

  INSERT INTO public.memberships (club_id, user_id, role, status, approved_by)
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

  UPDATE public.join_requests
  SET status = 'approved',
      updated_at = NOW()
  WHERE id = target_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_join_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_join_request(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.update_member_role(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_member_role(UUID, UUID, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can create join requests" ON public.join_requests;

CREATE POLICY "Authenticated users can request open clubs"
  ON public.join_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.clubs
      WHERE clubs.id = join_requests.club_id
        AND clubs.open_join = TRUE
    )
  );

CREATE TABLE IF NOT EXISTS public.club_specific_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_specific_invites_club_id
  ON public.club_specific_invites(club_id);

CREATE INDEX IF NOT EXISTS idx_club_specific_invites_token
  ON public.club_specific_invites(token);

ALTER TABLE public.club_specific_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club admins can view specific invites" ON public.club_specific_invites;
CREATE POLICY "Club admins can view specific invites"
  ON public.club_specific_invites FOR SELECT
  TO authenticated
  USING (private.is_club_admin(club_id));

CREATE OR REPLACE FUNCTION public.create_specific_club_invite_code(target_club_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  new_token TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  IF NOT private.is_club_admin(target_club_id) THEN
    RAISE EXCEPTION 'Only club admins can create specific invite links';
  END IF;

  LOOP
    new_token := 'S-' || upper(encode(gen_random_bytes(16), 'hex'));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.club_specific_invites WHERE token = new_token
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.clubs WHERE invite_code = new_token
    );
  END LOOP;

  INSERT INTO public.club_specific_invites (club_id, token, created_by)
  VALUES (target_club_id, new_token, current_user_id);

  RETURN new_token;
END;
$$;

REVOKE ALL ON FUNCTION public.create_specific_club_invite_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_specific_club_invite_code(UUID) TO authenticated;

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
    IF specific_invite.revoked_at IS NOT NULL THEN
      RAISE EXCEPTION 'This specific invite has been revoked';
    END IF;

    IF specific_invite.expires_at IS NOT NULL AND specific_invite.expires_at < NOW() THEN
      RAISE EXCEPTION 'This specific invite has expired';
    END IF;

    IF specific_invite.used_count >= specific_invite.max_uses THEN
      RAISE EXCEPTION 'This specific invite has already been used';
    END IF;

    SELECT *
    INTO existing_membership
    FROM public.memberships
    WHERE club_id = specific_invite.club_id
      AND user_id = current_user_id
    FOR UPDATE;

    IF existing_membership.id IS NOT NULL THEN
      IF existing_membership.status = 'active' THEN
        RETURN jsonb_build_object(
          'status', 'active',
          'club_id', existing_membership.club_id,
          'membership_id', existing_membership.id
        );
      END IF;

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role TEXT := 'member';
  invite_token TEXT := upper(trim(NEW.raw_user_meta_data->>'invite_token'));
  target_club public.clubs;
  specific_invite public.club_specific_invites;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE lower(email) = lower(NEW.email)
      AND role = 'superadmin'
  ) THEN
    assigned_role := 'superadmin';
  END IF;

  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    assigned_role
  );

  IF invite_token IS NOT NULL AND invite_token <> '' THEN
    SELECT *
    INTO specific_invite
    FROM public.club_specific_invites
    WHERE token = invite_token
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at >= NOW())
      AND used_count < max_uses
    FOR UPDATE;

    IF specific_invite.id IS NOT NULL THEN
      INSERT INTO public.memberships (club_id, user_id, role, status, approved_by)
      VALUES (specific_invite.club_id, NEW.id, 'member', 'active', specific_invite.created_by)
      ON CONFLICT (club_id, user_id)
      DO UPDATE SET
        status = 'active',
        role = CASE
          WHEN memberships.role = 'owner' THEN memberships.role
          ELSE 'member'
        END,
        approved_by = specific_invite.created_by,
        updated_at = NOW();

      UPDATE public.club_specific_invites
      SET used_count = used_count + 1
      WHERE id = specific_invite.id;

      RETURN NEW;
    END IF;

    SELECT *
    INTO target_club
    FROM public.clubs
    WHERE invite_code = invite_token;

    IF target_club.id IS NOT NULL THEN
      INSERT INTO public.join_requests (club_id, user_id, status)
      VALUES (target_club.id, NEW.id, 'pending')
      ON CONFLICT (club_id, user_id)
      DO UPDATE SET
        status = 'pending',
        updated_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_specific_club_invite_code(target_invite_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_invite public.club_specific_invites;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  SELECT *
  INTO target_invite
  FROM public.club_specific_invites
  WHERE id = target_invite_id
  FOR UPDATE;

  IF target_invite.id IS NULL THEN
    RAISE EXCEPTION 'Specific invite not found';
  END IF;

  IF NOT private.is_club_admin(target_invite.club_id) THEN
    RAISE EXCEPTION 'Only club admins can revoke specific invite links';
  END IF;

  UPDATE public.club_specific_invites
  SET revoked_at = NOW()
  WHERE id = target_invite_id
    AND revoked_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_specific_club_invite_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_specific_club_invite_code(UUID) TO authenticated;
