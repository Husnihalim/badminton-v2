CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role TEXT := 'member';
  invite_token TEXT := upper(trim(NEW.raw_user_meta_data->>'invite_token'));
  target_club clubs;
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

  IF invite_token IS NOT NULL AND invite_token <> '' THEN
    SELECT *
    INTO target_club
    FROM clubs
    WHERE invite_code = invite_token;

    IF target_club.id IS NOT NULL THEN
      INSERT INTO memberships (club_id, user_id, role, status, approved_by)
      VALUES (target_club.id, NEW.id, 'member', 'active', target_club.owner_id)
      ON CONFLICT (club_id, user_id)
      DO UPDATE SET
        status = 'active',
        role = CASE
          WHEN memberships.role = 'owner' THEN memberships.role
          ELSE 'member'
        END,
        approved_by = target_club.owner_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
