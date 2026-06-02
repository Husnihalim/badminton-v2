CREATE OR REPLACE FUNCTION public.prevent_duplicate_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email = lower(trim(NEW.email));

  IF EXISTS (
    SELECT 1
    FROM profiles
    WHERE lower(email) = NEW.email
      AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Email is already registered';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_profile_email_trigger ON profiles;

CREATE TRIGGER prevent_duplicate_profile_email_trigger
  BEFORE INSERT OR UPDATE OF email ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_profile_email();
