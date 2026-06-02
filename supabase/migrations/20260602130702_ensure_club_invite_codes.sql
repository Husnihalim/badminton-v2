-- Ensure every club has a shareable invite code by default.
-- This repairs any existing missing codes and keeps future club creation safe.

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
  IF NEW.invite_code IS NULL OR btrim(NEW.invite_code) = '' THEN
    LOOP
      generated_code := upper(encode(gen_random_bytes(12), 'hex'));
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public.clubs
        WHERE invite_code = generated_code
      );
    END LOOP;

    NEW.invite_code := generated_code;
  ELSE
    NEW.invite_code := upper(btrim(NEW.invite_code));
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_club_invite_code() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_club_generate_invite_code ON public.clubs;
CREATE TRIGGER on_club_generate_invite_code
BEFORE INSERT ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.generate_club_invite_code();

DO $$
DECLARE
  club_record RECORD;
  generated_code TEXT;
BEGIN
  FOR club_record IN
    SELECT id
    FROM public.clubs
    WHERE invite_code IS NULL OR btrim(invite_code) = ''
  LOOP
    LOOP
      generated_code := upper(encode(gen_random_bytes(12), 'hex'));
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public.clubs
        WHERE invite_code = generated_code
      );
    END LOOP;

    UPDATE public.clubs
    SET invite_code = generated_code
    WHERE id = club_record.id;
  END LOOP;
END;
$$;
