-- KelabSukan Unified Competitions Engine (Friendlies & Tournaments)
-- Migration: Create unified competitions, pools, participants, and matchups

-- ============================================
-- CLEANUP: Drop old friendly tables first
-- ============================================
DROP TABLE IF EXISTS friendly_invites CASCADE;
DROP TABLE IF EXISTS friendly_matchups CASCADE;
DROP TABLE IF EXISTS friendly_pairs CASCADE;
DROP TABLE IF EXISTS friendlies CASCADE;

-- ============================================
-- COMPETITIONS TABLE
-- ============================================
CREATE TABLE competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL, -- Host/inviting club
    opponent_club_id UUID REFERENCES clubs(id) ON DELETE SET NULL, -- Specifically for 'team_friendly' format
    opponent_club_name TEXT, -- Specifically for 'team_friendly' guest clubs
    title TEXT NOT NULL, -- e.g., "LEP BC vs Smashers PJ" or "Summer Open"
    sport TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('team_friendly', 'round_robin', 'single_elimination', 'pool_playoffs')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration', 'accepted', 'matchmaking', 'live', 'completed', 'declined', 'cancelled')),
    rules TEXT,
    start_date TIMESTAMPTZ,
    pair_count INTEGER CHECK (pair_count IN (4, 5)), -- Specifically for 'team_friendly' formats
    winning_club_id UUID REFERENCES clubs(id) ON DELETE SET NULL, -- Specifically for 'team_friendly' formats
    winner_participant_id UUID, -- For tournaments/individual formats (set later)
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    invite_code TEXT UNIQUE NOT NULL
);

-- Enable RLS
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitions
CREATE POLICY "Competitions viewable by participating club members"
    ON competitions FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id IN (competitions.club_id, competitions.opponent_club_id) AND status = 'active'
        )
    );

CREATE POLICY "Club owners/admins can create competitions"
    ON competitions FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id = competitions.club_id AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Club owners/admins can update their competitions"
    ON competitions FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id IN (competitions.club_id, competitions.opponent_club_id) AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Club owners can delete their competitions"
    ON competitions FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id = competitions.club_id AND role = 'owner'
        )
    );

-- ============================================
-- COMPETITION POOLS TABLE
-- ============================================
CREATE TABLE competition_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- e.g., "Pool A", "Pool B"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE competition_pools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competition_pools
CREATE POLICY "Competition pools viewable by participating club members"
    ON competition_pools FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN memberships m ON m.club_id IN (c.club_id, c.opponent_club_id)
            WHERE c.id = competition_pools.competition_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

CREATE POLICY "Club owners/admins can manage pools"
    ON competition_pools FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN memberships m ON m.club_id = c.club_id
            WHERE c.id = competition_pools.competition_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- COMPETITION PARTICIPANTS TABLE
-- ============================================
CREATE TABLE competition_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
    pool_id UUID REFERENCES competition_pools(id) ON DELETE SET NULL,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE, -- Tracks player/pair club context
    name TEXT NOT NULL, -- Player name or Pair name (e.g., "Husni / Amir")
    user_1_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Null for singles
    seed INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competition_id, user_1_id, user_2_id)
);

-- Enable RLS
ALTER TABLE competition_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competition_participants
CREATE POLICY "Competition participants viewable by participating club members"
    ON competition_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN memberships m ON m.club_id IN (c.club_id, c.opponent_club_id)
            WHERE c.id = competition_participants.competition_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

CREATE POLICY "Active members can register as participants"
    ON competition_participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN memberships m ON m.club_id = competition_participants.club_id
            WHERE c.id = competition_participants.competition_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

CREATE POLICY "Club owners/admins can manage participants"
    ON competition_participants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN memberships m ON m.club_id = c.club_id
            WHERE c.id = competition_participants.competition_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Club owners/admins can delete participants"
    ON competition_participants FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN memberships m ON m.club_id = c.club_id
            WHERE c.id = competition_participants.competition_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- COMPETITION MATCHUPS TABLE
-- ============================================
CREATE TABLE competition_matchups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
    pool_id UUID REFERENCES competition_pools(id) ON DELETE SET NULL,
    participant_a_id UUID REFERENCES competition_participants(id) ON DELETE CASCADE NOT NULL,
    participant_b_id UUID REFERENCES competition_participants(id) ON DELETE CASCADE NOT NULL,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL, -- Link to core match/score sets
    order_index INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'completed')),
    winner_participant_id UUID REFERENCES competition_participants(id) ON DELETE SET NULL,
    bracket_round INTEGER, -- For knockout playoffs (1 = Quarters, 2 = Semis, 3 = Finals, etc.)
    bracket_position INTEGER, -- For knockout playoffs layout positioning
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competition_id, participant_a_id, participant_b_id)
);

-- Enable RLS
ALTER TABLE competition_matchups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competition_matchups
CREATE POLICY "Competition matchups viewable by participating club members"
    ON competition_matchups FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN memberships m ON m.club_id IN (c.club_id, c.opponent_club_id)
            WHERE c.id = competition_matchups.competition_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

CREATE POLICY "Club owners/admins can manage matchups"
    ON competition_matchups FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM competitions c
            JOIN memberships m ON m.club_id IN (c.club_id, c.opponent_club_id)
            WHERE c.id = competition_matchups.competition_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- LINK CORE MATCHES TO COMPETITIONS
-- ============================================
ALTER TABLE matches 
    ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tournament_pool_id UUID REFERENCES competition_pools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_pool_id ON matches(tournament_pool_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_competitions_club_id ON competitions(club_id);
CREATE INDEX idx_competitions_opponent_club_id ON competitions(opponent_club_id);
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_invite_code ON competitions(invite_code);

CREATE INDEX idx_competition_pools_competition_id ON competition_pools(competition_id);

CREATE INDEX idx_competition_participants_competition_id ON competition_participants(competition_id);
CREATE INDEX idx_competition_participants_pool_id ON competition_participants(pool_id);
CREATE INDEX idx_competition_participants_club_id ON competition_participants(club_id);

CREATE INDEX idx_competition_matchups_competition_id ON competition_matchups(competition_id);
CREATE INDEX idx_competition_matchups_pool_id ON competition_matchups(pool_id);
CREATE INDEX idx_competition_matchups_match_id ON competition_matchups(match_id);

-- ============================================
-- STATUS CHANGE TIMESTAMPS TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_competition_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_competition_status_change
    BEFORE UPDATE ON competitions
    FOR EACH ROW EXECUTE FUNCTION update_competition_status_timestamp();

-- ============================================
-- REALTIME CONFIGURATION
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE competitions;
        ALTER PUBLICATION supabase_realtime ADD TABLE competition_pools;
        ALTER PUBLICATION supabase_realtime ADD TABLE competition_participants;
        ALTER PUBLICATION supabase_realtime ADD TABLE competition_matchups;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
