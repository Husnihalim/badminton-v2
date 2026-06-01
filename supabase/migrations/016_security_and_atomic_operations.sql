-- Security hardening and atomic write helpers.
-- Keeps platform-owner roles server-controlled and moves fanout writes out of
-- direct browser table access.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS platform_admins (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'superadmin' CHECK (role = 'superadmin'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

INSERT INTO platform_admins (email, role)
VALUES ('mohdhusni@gmail.com', 'superadmin')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

CREATE OR REPLACE FUNCTION private.is_platform_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM platform_admins pa
    JOIN profiles p ON lower(p.email) = lower(pa.email)
    WHERE p.id = auth.uid()
      AND pa.role = 'superadmin'
  );
$$;

REVOKE ALL ON FUNCTION private.is_platform_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_platform_superadmin() TO authenticated;

DROP POLICY IF EXISTS "Platform admins can view platform admins" ON platform_admins;
CREATE POLICY "Platform admins can view platform admins"
  ON platform_admins FOR SELECT
  TO authenticated
  USING (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Platform admins can manage platform admins" ON platform_admins;
CREATE POLICY "Platform admins can manage platform admins"
  ON platform_admins FOR ALL
  TO authenticated
  USING (private.is_platform_superadmin())
  WITH CHECK (private.is_platform_superadmin());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role TEXT := 'member';
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM platform_admins
    WHERE lower(email) = lower(NEW.email)
      AND role = 'superadmin'
  ) THEN
    assigned_role := 'superadmin';
  END IF;

  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    assigned_role
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

UPDATE profiles p
SET role = 'superadmin'
FROM platform_admins pa
WHERE lower(p.email) = lower(pa.email)
  AND pa.role = 'superadmin';

UPDATE profiles p
SET role = 'member'
WHERE role = 'superadmin'
  AND NOT EXISTS (
    SELECT 1
    FROM platform_admins pa
    WHERE lower(pa.email) = lower(p.email)
      AND pa.role = 'superadmin'
  );

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Active club members can create club activities" ON club_activities;

CREATE OR REPLACE FUNCTION public.create_club_notifications(
  target_club_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_data JSONB DEFAULT '{}'::jsonb,
  activity_title TEXT DEFAULT NULL,
  activity_description TEXT DEFAULT NULL,
  actor_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  normalized_activity_type TEXT;
  resolved_actor_name TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  IF notification_type NOT IN (
    'join_request',
    'join_approved',
    'event_reminder',
    'event_created',
    'rsvp_update',
    'score_recorded',
    'announcement'
  ) THEN
    RAISE EXCEPTION 'Invalid notification type';
  END IF;

  IF notification_type IN ('announcement', 'event_created', 'join_approved') THEN
    IF NOT private.is_club_admin(target_club_id) THEN
      RAISE EXCEPTION 'Only club admins can send this notification';
    END IF;
  ELSIF NOT private.is_active_club_member(target_club_id) THEN
    RAISE EXCEPTION 'Must be an active club member';
  END IF;

  INSERT INTO notifications (user_id, type, title, message, data, read)
  SELECT
    m.user_id,
    notification_type,
    notification_title,
    notification_message,
    COALESCE(notification_data, '{}'::jsonb),
    FALSE
  FROM memberships m
  WHERE m.club_id = target_club_id
    AND m.status = 'active';

  IF activity_title IS NOT NULL AND activity_description IS NOT NULL THEN
    SELECT COALESCE(p.display_name, p.name, actor_name, 'Club member')
    INTO resolved_actor_name
    FROM profiles p
    WHERE p.id = current_user_id;

    normalized_activity_type :=
      CASE
        WHEN notification_type = 'score_recorded' THEN 'match_recorded'
        WHEN notification_type IN ('event_created', 'rsvp_update', 'announcement') THEN notification_type
        ELSE 'announcement'
      END;

    INSERT INTO club_activities (club_id, type, title, description, actor_name)
    VALUES (
      target_club_id,
      normalized_activity_type,
      activity_title,
      activity_description,
      COALESCE(resolved_actor_name, actor_name, 'Club member')
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_club_notifications(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_club_notifications(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_match_with_details(
  match_club_id UUID,
  match_title TEXT,
  match_sport TEXT,
  match_type_input TEXT,
  match_date_input DATE,
  participants_input JSONB,
  score_sets_input JSONB
)
RETURNS matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  created_match matches;
  participant JSONB;
  score_set JSONB;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to record a match';
  END IF;

  IF NOT private.is_active_club_member(match_club_id) THEN
    RAISE EXCEPTION 'Must be an active club member to record a match';
  END IF;

  IF match_type_input NOT IN ('singles', 'doubles') THEN
    RAISE EXCEPTION 'Invalid match type';
  END IF;

  IF jsonb_typeof(participants_input) <> 'array' OR jsonb_array_length(participants_input) < 2 THEN
    RAISE EXCEPTION 'At least two participants are required';
  END IF;

  IF jsonb_typeof(score_sets_input) <> 'array' OR jsonb_array_length(score_sets_input) < 1 THEN
    RAISE EXCEPTION 'At least one score set is required';
  END IF;

  INSERT INTO matches (club_id, title, sport, match_type, recorded_by, match_date)
  VALUES (
    match_club_id,
    NULLIF(trim(match_title), ''),
    match_sport,
    match_type_input,
    current_user_id,
    COALESCE(match_date_input, CURRENT_DATE)
  )
  RETURNING * INTO created_match;

  FOR participant IN SELECT * FROM jsonb_array_elements(participants_input)
  LOOP
    INSERT INTO match_participants (match_id, user_id, team, is_guest, guest_name)
    VALUES (
      created_match.id,
      NULLIF(participant->>'user_id', '')::uuid,
      (participant->>'team')::integer,
      COALESCE((participant->>'is_guest')::boolean, FALSE),
      NULLIF(trim(participant->>'guest_name'), '')
    );
  END LOOP;

  FOR score_set IN SELECT * FROM jsonb_array_elements(score_sets_input)
  LOOP
    INSERT INTO score_sets (match_id, set_number, team1_score, team2_score)
    VALUES (
      created_match.id,
      (score_set->>'set_number')::integer,
      (score_set->>'team1_score')::integer,
      (score_set->>'team2_score')::integer
    );
  END LOOP;

  RETURN created_match;
END;
$$;

REVOKE ALL ON FUNCTION public.create_match_with_details(UUID, TEXT, TEXT, TEXT, DATE, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_match_with_details(UUID, TEXT, TEXT, TEXT, DATE, JSONB, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.regenerate_club_invite_code(target_club_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  IF NOT private.is_club_admin(target_club_id) THEN
    RAISE EXCEPTION 'Only club admins can regenerate invite links';
  END IF;

  LOOP
    new_token := upper(encode(gen_random_bytes(12), 'hex'));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM clubs WHERE invite_code = new_token
    );
  END LOOP;

  UPDATE clubs
  SET invite_code = new_token
  WHERE id = target_club_id;

  RETURN new_token;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_club_invite_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_club_invite_code(UUID) TO authenticated;
