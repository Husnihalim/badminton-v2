-- Add the nullable match link used when a competition matchup is scored.
ALTER TABLE public.competition_matchups
  ADD COLUMN IF NOT EXISTS match_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_competition_matchups_match'
      AND conrelid = 'public.competition_matchups'::regclass
  ) THEN
    ALTER TABLE public.competition_matchups
      ADD CONSTRAINT fk_competition_matchups_match
      FOREIGN KEY (match_id)
      REFERENCES public.matches(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_competition_matchups_match_id
  ON public.competition_matchups(match_id);
