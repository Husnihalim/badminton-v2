-- Automatically set a unique invite code for new clubs.
-- This ensures every created club can share an invite link immediately.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.generate_club_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_code TEXT;
BEGIN
  IF NEW.invite_code IS NULL OR trim(NEW.invite_code) = '' THEN
    LOOP
      generated_code := upper(encode(gen_random_bytes(12), 'hex'));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM clubs WHERE invite_code = generated_code
      );
    END LOOP;
    NEW.invite_code := generated_code;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_club_generate_invite_code ON clubs;
CREATE TRIGGER on_club_generate_invite_code
BEFORE INSERT ON clubs
FOR EACH ROW EXECUTE FUNCTION public.generate_club_invite_code();
