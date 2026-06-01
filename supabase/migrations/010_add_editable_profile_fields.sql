ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS preferred_sport TEXT;

UPDATE profiles
SET display_name = COALESCE(display_name, name)
WHERE display_name IS NULL;

CREATE OR REPLACE FUNCTION public.keep_locked_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF auth.uid() = OLD.id THEN
    NEW.id = OLD.id;
    NEW.email = OLD.email;
    NEW.name = OLD.name;
    NEW.role = OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keep_locked_profile_fields_trigger ON profiles;

CREATE TRIGGER keep_locked_profile_fields_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.keep_locked_profile_fields();

DROP POLICY IF EXISTS "Users can join open clubs" ON memberships;
