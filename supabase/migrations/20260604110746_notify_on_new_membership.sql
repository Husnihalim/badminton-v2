-- Update join_club_by_invite_code to return existing membership if already active instead of raising an exception.
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
END;
$$; -- Stub for dropping/recreating safely

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

  IF target_club.id IS NOT NULL THEN
    -- Make sure we got it
  ELSE
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT *
  INTO existing_membership
  FROM memberships
  WHERE club_id = target_club.id
    AND user_id = current_user_id;

  IF existing_membership.id IS NOT NULL THEN
    IF existing_membership.status = 'active' THEN
      RETURN existing_membership; -- Safely return the existing membership without raising an error
    END IF;

    UPDATE memberships
    SET status = 'active',
        role = 'member',
        approved_by = target_club.owner_id,
        updated_at = NOW()
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

-- Create memberships active state trigger to log activity feed and notify team + admins.
CREATE OR REPLACE FUNCTION public.handle_active_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_member_name TEXT;
  target_club_name TEXT;
BEGIN
  -- We only proceed if status transitions to active
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status <> 'active')) THEN
     
     -- Get the user's name
     SELECT COALESCE(display_name, name, 'A new member')
     INTO new_member_name
     FROM profiles
     WHERE id = NEW.user_id;

     -- Get the club name
     SELECT name
     INTO target_club_name
     FROM clubs
     WHERE id = NEW.club_id;

     -- 1. Insert a club activity
     INSERT INTO club_activities (club_id, type, title, description, actor_name)
     VALUES (
       NEW.club_id,
       'member_joined',
       'New Member Joined',
       new_member_name || ' has joined the club!',
       new_member_name
     );

     -- 2. Insert notifications for all other active members and admins of the club
     INSERT INTO notifications (user_id, type, title, message, data, read)
     SELECT
       m.user_id,
       'announcement',
       'New Member Joined',
       new_member_name || ' has joined ' || target_club_name || '! Welcoming them to the team.',
       jsonb_build_object('clubId', NEW.club_id, 'userId', NEW.user_id, 'type', 'member_joined'),
       FALSE
     FROM memberships m
     WHERE m.club_id = NEW.club_id
       AND m.status = 'active'
       AND m.user_id <> NEW.user_id; -- Exclude the joining user themselves
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create it
DROP TRIGGER IF EXISTS trigger_active_membership ON memberships;
CREATE TRIGGER trigger_active_membership
  AFTER INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_active_membership();
