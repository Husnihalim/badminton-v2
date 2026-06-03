-- Add event_id column to matches to link them to club game night sessions
ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Create index for query performance when filtering by event/session
CREATE INDEX IF NOT EXISTS idx_matches_event_id ON matches(event_id);

-- Drop old RPC to avoid overload conflicts
DROP FUNCTION IF EXISTS public.create_match_with_details(UUID, TEXT, TEXT, TEXT, DATE, JSONB, JSONB);

-- Redefine create_match_with_details with optional match_event_id parameter
CREATE OR REPLACE FUNCTION public.create_match_with_details(
  match_club_id UUID,
  match_title TEXT,
  match_sport TEXT,
  match_type_input TEXT,
  match_date_input DATE,
  participants_input JSONB,
  score_sets_input JSONB,
  match_event_id UUID DEFAULT NULL
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

  INSERT INTO matches (club_id, title, sport, match_type, recorded_by, match_date, event_id)
  VALUES (
    match_club_id,
    NULLIF(trim(match_title), ''),
    match_sport,
    match_type_input,
    current_user_id,
    COALESCE(match_date_input, CURRENT_DATE),
    match_event_id
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

REVOKE ALL ON FUNCTION public.create_match_with_details(UUID, TEXT, TEXT, TEXT, DATE, JSONB, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_match_with_details(UUID, TEXT, TEXT, TEXT, DATE, JSONB, JSONB, UUID) TO authenticated;
