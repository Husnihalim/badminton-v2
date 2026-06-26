-- Fix handle_new_user to re-include the platform_admins check
-- The previous migration that added avatar_url support accidentally dropped
-- the logic that assigns 'superadmin' role on signup if the email exists
-- in the platform_admins table.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT := 'member';
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Check if user is a platform superadmin
  IF EXISTS (
    SELECT 1
    FROM platform_admins
    WHERE lower(email) = lower(NEW.email)
      AND role = 'superadmin'
  ) THEN
    assigned_role := 'superadmin';
  END IF;

  -- Insert the profile
  INSERT INTO profiles (
    id, 
    email, 
    name, 
    role, 
    display_name, 
    city, 
    preferred_sport, 
    gear, 
    is_private,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'city',
    COALESCE(NEW.raw_user_meta_data->>'preferred_sport', 'badminton'),
    COALESCE(NEW.raw_user_meta_data->'gear', '{}'::jsonb),
    COALESCE((NEW.raw_user_meta_data->>'is_private')::boolean, false),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Insert a welcome reminder notification to complete player card
  INSERT INTO notifications (user_id, type, title, message, data, read)
  VALUES (
    NEW.id,
    'announcement',
    'Welcome to KelabSukan! ⚡',
    'Complete your Player Card now! Add your playstyle and racket specs (weight, balance, stiffness) to unlock personalized matches and stories.',
    '{"path": "/profile"}'::jsonb,
    false
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
