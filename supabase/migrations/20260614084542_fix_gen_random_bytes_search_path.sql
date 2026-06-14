-- Fix the functions calling gen_random_bytes by including extensions in search_path

CREATE OR REPLACE FUNCTION public.generate_club_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

CREATE OR REPLACE FUNCTION public.regenerate_club_invite_code(target_club_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

CREATE OR REPLACE FUNCTION public.create_specific_club_invite_code(target_club_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
