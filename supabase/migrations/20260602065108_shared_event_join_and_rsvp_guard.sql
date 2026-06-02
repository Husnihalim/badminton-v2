CREATE OR REPLACE FUNCTION public.join_club_by_shared_event(target_event_id UUID)
RETURNS memberships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  target_event events;
  target_club clubs;
  existing_membership memberships;
  new_membership memberships;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to join this game day';
  END IF;

  SELECT *
  INTO target_event
  FROM events
  WHERE id = target_event_id;

  IF target_event.id IS NULL THEN
    RAISE EXCEPTION 'Game day not found';
  END IF;

  IF target_event.signup_open IS NOT TRUE THEN
    RAISE EXCEPTION 'Signup is closed for this game day';
  END IF;

  SELECT *
  INTO target_club
  FROM clubs
  WHERE id = target_event.club_id;

  IF target_club.id IS NULL THEN
    RAISE EXCEPTION 'Club not found';
  END IF;

  IF target_club.open_join IS NOT TRUE THEN
    RAISE EXCEPTION 'This club is not open for public joining';
  END IF;

  SELECT *
  INTO existing_membership
  FROM memberships
  WHERE club_id = target_club.id
    AND user_id = current_user_id;

  IF existing_membership.id IS NOT NULL THEN
    IF existing_membership.status = 'active' THEN
      RETURN existing_membership;
    END IF;

    UPDATE memberships
    SET status = 'active',
        role = CASE
          WHEN memberships.role = 'owner' THEN memberships.role
          ELSE 'member'
        END,
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

REVOKE ALL ON FUNCTION public.join_club_by_shared_event(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_club_by_shared_event(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.join_club_by_shared_event(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.join_club_by_shared_event(UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can RSVP to events" ON event_rsvps;
DROP POLICY IF EXISTS "Users can update their own RSVP" ON event_rsvps;
DROP POLICY IF EXISTS "Users can create/update their own RSVPs" ON event_rsvps;
DROP POLICY IF EXISTS "Active club members can RSVP to events" ON event_rsvps;
DROP POLICY IF EXISTS "Active club members can update their own RSVP" ON event_rsvps;

CREATE POLICY "Active club members can RSVP to events"
  ON event_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM events e
      JOIN memberships m ON m.club_id = e.club_id
      WHERE e.id = event_rsvps.event_id
        AND m.user_id = (SELECT auth.uid())
        AND m.status = 'active'
    )
  );

CREATE POLICY "Active club members can update their own RSVP"
  ON event_rsvps FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM events e
      JOIN memberships m ON m.club_id = e.club_id
      WHERE e.id = event_rsvps.event_id
        AND m.user_id = (SELECT auth.uid())
        AND m.status = 'active'
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM events e
      JOIN memberships m ON m.club_id = e.club_id
      WHERE e.id = event_rsvps.event_id
        AND m.user_id = (SELECT auth.uid())
        AND m.status = 'active'
    )
  );
