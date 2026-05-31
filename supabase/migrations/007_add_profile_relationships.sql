-- Add explicit public profile relationships for PostgREST embeds.
-- Several app queries use profiles(...) from membership, join request,
-- match participant, and RSVP rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'memberships_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE memberships
      ADD CONSTRAINT memberships_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'join_requests_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE join_requests
      ADD CONSTRAINT join_requests_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_participants_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE match_participants
      ADD CONSTRAINT match_participants_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_rsvps_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE event_rsvps
      ADD CONSTRAINT event_rsvps_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
