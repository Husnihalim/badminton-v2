-- Add FK constraint from competition_matchups.match_id → matches.id.
-- This enables PostgREST resource embedding (match:matches(...)) in
-- getCompetitionMatchups queries. The FK is nullable because matchups
-- can be created (pending) before a match is recorded.
ALTER TABLE competition_matchups
  ADD CONSTRAINT fk_competition_matchups_match
  FOREIGN KEY (match_id)
  REFERENCES matches(id)
  ON DELETE SET NULL;
