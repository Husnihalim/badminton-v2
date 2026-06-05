-- Add foreign key constraint linking matches(recorded_by) to profiles(id)
-- This allows PostgREST to embed the profile of the recorder (member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_recorded_by_profiles_fkey'
  ) THEN
    ALTER TABLE matches
      ADD CONSTRAINT matches_recorded_by_profiles_fkey
      FOREIGN KEY (recorded_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
