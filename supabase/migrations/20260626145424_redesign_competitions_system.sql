-- KelabSukan Competition Redesign
-- Simplify: friendly (2 clubs) & league/round-robin (3+ clubs)
-- Remove: pools, bracket, playoffs complexity
-- Add: flexible pairs, roster modes, declaration handshake, pre-game editing

-- ============================================
-- MODIFY COMPETITIONS TABLE
-- ============================================

-- Drop old CHECK constraints (column drops happen after RLS updates below)
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_format_check;
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_status_check;
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_pair_count_check;

-- Rename pair_count -> pairs_count, remove CHECK
ALTER TABLE competitions RENAME COLUMN pair_count TO pairs_count;
ALTER TABLE competitions ALTER COLUMN pairs_count DROP NOT NULL;
ALTER TABLE competitions ALTER COLUMN pairs_count SET DEFAULT 5;

-- Simplify format: only 'friendly' or 'league'
ALTER TABLE competitions ADD CONSTRAINT competitions_format_check
    CHECK (format IN ('friendly', 'league'));

-- Simplify status
ALTER TABLE competitions ADD CONSTRAINT competitions_status_check
    CHECK (status IN ('draft', 'registration', 'matchmaking', 'live', 'completed', 'cancelled'));

-- Update existing data (development migration)
UPDATE competitions SET format = 'friendly' WHERE format IN ('team_friendly', 'single_elimination', 'pool_playoffs');
UPDATE competitions SET format = 'league' WHERE format = 'round_robin';
UPDATE competitions SET status = 'registration' WHERE status IN ('accepted', 'pending');
UPDATE competitions SET status = 'cancelled' WHERE status IN ('declined');

-- New columns
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS sets_count INTEGER DEFAULT 1;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS points_per_set INTEGER DEFAULT 21;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS roster_mode TEXT DEFAULT 'admin'
    CHECK (roster_mode IN ('admin', 'open'));

-- ============================================
-- CREATE COMPETITION_CLUBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS competition_clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'confirmed', 'declined')),
    lineup_confirmed BOOLEAN NOT NULL DEFAULT false,
    lineup_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competition_id, club_id)
);

ALTER TABLE competition_clubs ENABLE ROW LEVEL SECURITY;

-- RLS: participating club members can view
CREATE POLICY "Competition clubs viewable by participating clubs members"
    ON competition_clubs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN memberships m ON m.club_id = competition_clubs.club_id
            WHERE c.id = competition_clubs.competition_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

-- RLS: club owners/admins can manage their club's entry
CREATE POLICY "Club owners/admins can manage their competition entry"
    ON competition_clubs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.club_id = competition_clubs.club_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
    );

CREATE INDEX idx_competition_clubs_competition_id ON competition_clubs(competition_id);
CREATE INDEX idx_competition_clubs_club_id ON competition_clubs(club_id);

-- ============================================
-- MODIFY COMPETITION_PARTICIPANTS
-- ============================================
ALTER TABLE competition_participants ADD COLUMN IF NOT EXISTS rank INTEGER;

CREATE INDEX IF NOT EXISTS idx_competition_participants_rank ON competition_participants(competition_id, club_id, rank);

-- ============================================
-- MODIFY COMPETITION_MATCHUPS
-- ============================================
ALTER TABLE competition_matchups ADD COLUMN IF NOT EXISTS club_a_id UUID REFERENCES competition_clubs(id) ON DELETE SET NULL;
ALTER TABLE competition_matchups ADD COLUMN IF NOT EXISTS club_b_id UUID REFERENCES competition_clubs(id) ON DELETE SET NULL;
ALTER TABLE competition_matchups ADD COLUMN IF NOT EXISTS winner_club_id UUID REFERENCES competition_clubs(id) ON DELETE SET NULL;
ALTER TABLE competition_matchups ADD COLUMN IF NOT EXISTS round_index INTEGER;
ALTER TABLE competition_matchups ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_competition_matchups_club_a ON competition_matchups(club_a_id);
CREATE INDEX IF NOT EXISTS idx_competition_matchups_club_b ON competition_matchups(club_b_id);
CREATE INDEX IF NOT EXISTS idx_competition_matchups_round ON competition_matchups(competition_id, round_index);

-- Drop old opponent_club_id index
DROP INDEX IF EXISTS idx_competitions_opponent_club_id;

-- Add new index
CREATE INDEX IF NOT EXISTS idx_competitions_pairs_count ON competitions(pairs_count);

-- ============================================
-- UPDATE RLS ON COMPETITIONS (remove opponent_club_id refs)
-- ============================================
DROP POLICY IF EXISTS "Competitions viewable by participating club members" ON competitions;
CREATE POLICY "Competitions viewable by participating club members"
    ON competitions FOR SELECT
    USING (
        auth.uid() IN (
            SELECT m.user_id FROM memberships m
            JOIN competition_clubs cc ON cc.club_id = m.club_id
            WHERE cc.competition_id = competitions.id
            AND m.status = 'active'
        )
        OR
        competitions.club_id IN (
            SELECT club_id FROM memberships
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- ============================================
-- UPDATE RLS ON POOLS (remove opponent_club_id refs)
-- ============================================
DROP POLICY IF EXISTS "Competition pools viewable by participating club members" ON competition_pools;
CREATE POLICY "Competition pools viewable by participating club members"
    ON competition_pools FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN competition_clubs cc ON cc.competition_id = c.id
            JOIN memberships m ON m.club_id = cc.club_id
            WHERE c.id = competition_pools.competition_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

-- ============================================
-- UPDATE RLS ON PARTICIPANTS (remove opponent_club_id refs)
-- ============================================
DROP POLICY IF EXISTS "Competition participants viewable by participating club members" ON competition_participants;
CREATE POLICY "Competition participants viewable by participating club members"
    ON competition_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN competition_clubs cc ON cc.competition_id = c.id
            JOIN memberships m ON m.club_id = cc.club_id
            WHERE c.id = competition_participants.competition_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

-- ============================================
-- UPDATE RLS ON MATCHUPS (remove opponent_club_id refs)
-- ============================================
DROP POLICY IF EXISTS "Competition matchups viewable by participating club members" ON competition_matchups;
CREATE POLICY "Competition matchups viewable by participating club members"
    ON competition_matchups FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN competition_clubs cc ON cc.competition_id = c.id
            JOIN memberships m ON m.club_id = cc.club_id
            WHERE c.id = competition_matchups.competition_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

-- Drop old policies that reference opponent_club_id
DROP POLICY IF EXISTS "Club owners/admins can update their competitions" ON competitions;
DROP POLICY IF EXISTS "Club owners/admins can manage matchups" ON competition_matchups;

-- Create new policies for competitions
CREATE POLICY "Club owners/admins can update their competitions"
    ON competitions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM memberships m
            JOIN competition_clubs cc ON cc.club_id = m.club_id
            WHERE cc.competition_id = competitions.id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Club owners/admins can manage matchups"
    ON competition_matchups FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM memberships m
            JOIN competition_clubs cc ON cc.club_id = m.club_id
            WHERE cc.competition_id = competition_matchups.competition_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- CLEANUP: drop old columns (must be after all RLS updates)
-- ============================================
ALTER TABLE competitions DROP COLUMN IF EXISTS opponent_club_id;
ALTER TABLE competitions DROP COLUMN IF EXISTS opponent_club_name;
DROP INDEX IF EXISTS idx_competitions_opponent_club_id;

-- ============================================
-- NOTIFICATION TYPE FOR COMPETITION EVENTS
-- ============================================
-- Add competition notification types to existing notifications
-- (notifications table already uses TEXT for type, no constraint change needed)

-- ============================================
-- REALTIME: ADD COMPETITION_CLUBS
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE competition_clubs;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
