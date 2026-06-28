-- Prevent one player from being assigned twice in the same competition or matchup.

CREATE OR REPLACE FUNCTION public.prevent_duplicate_competition_participant_players()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_1_id IS NOT NULL
     AND NEW.user_2_id IS NOT NULL
     AND NEW.user_1_id = NEW.user_2_id THEN
    RAISE EXCEPTION 'A competition pair needs two different players.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.competition_participants existing
    WHERE existing.competition_id = NEW.competition_id
      AND existing.id <> NEW.id
      AND (
        (NEW.user_1_id IS NOT NULL AND NEW.user_1_id IN (existing.user_1_id, existing.user_2_id))
        OR
        (NEW.user_2_id IS NOT NULL AND NEW.user_2_id IN (existing.user_1_id, existing.user_2_id))
      )
  ) THEN
    RAISE EXCEPTION 'Each player can only appear once in a competition.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_competition_participant_players
  ON public.competition_participants;

CREATE TRIGGER prevent_duplicate_competition_participant_players
  BEFORE INSERT OR UPDATE OF competition_id, user_1_id, user_2_id
  ON public.competition_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_competition_participant_players();

CREATE OR REPLACE FUNCTION public.prevent_invalid_competition_matchup_players()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  participant_a public.competition_participants%ROWTYPE;
  participant_b public.competition_participants%ROWTYPE;
BEGIN
  IF NEW.participant_a_id = NEW.participant_b_id THEN
    RAISE EXCEPTION 'A pair cannot play against itself.';
  END IF;

  SELECT * INTO participant_a
  FROM public.competition_participants
  WHERE id = NEW.participant_a_id;

  SELECT * INTO participant_b
  FROM public.competition_participants
  WHERE id = NEW.participant_b_id;

  IF participant_a.competition_id <> NEW.competition_id
     OR participant_b.competition_id <> NEW.competition_id THEN
    RAISE EXCEPTION 'Matchup participants must belong to the same competition.';
  END IF;

  IF (participant_a.user_1_id IS NOT NULL AND participant_a.user_1_id IN (participant_b.user_1_id, participant_b.user_2_id))
     OR (participant_a.user_2_id IS NOT NULL AND participant_a.user_2_id IN (participant_b.user_1_id, participant_b.user_2_id)) THEN
    RAISE EXCEPTION 'Matchup pairs cannot share a player.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_invalid_competition_matchup_players
  ON public.competition_matchups;

CREATE TRIGGER prevent_invalid_competition_matchup_players
  BEFORE INSERT OR UPDATE OF competition_id, participant_a_id, participant_b_id
  ON public.competition_matchups
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_invalid_competition_matchup_players();

