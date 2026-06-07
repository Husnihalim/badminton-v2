-- KelabSukan Cross-Club Friendly Feature
-- Migration: Add friendly tables for inter-club play

-- ============================================
-- FRIENDLIES TABLE
-- ============================================
CREATE TABLE friendlies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviting_club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
    invited_club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
    invited_club_name TEXT NOT NULL,
    invited_contact TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'matchmaking', 'live', 'completed', 'declined', 'cancelled')),
    pair_count INTEGER NOT NULL DEFAULT 5 CHECK (pair_count IN (4, 5)),
    winning_club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    matchmaking_locked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    invite_code TEXT UNIQUE NOT NULL
);

-- Enable RLS
ALTER TABLE friendlies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendlies
CREATE POLICY "Friendlies viewable by participating club members"
    ON friendlies FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id IN (inviting_club_id, invited_club_id) AND status = 'active'
        )
    );

CREATE POLICY "Club owners can create friendlies"
    ON friendlies FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id = inviting_club_id AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Club owners can update their friendlies"
    ON friendlies FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id IN (inviting_club_id, invited_club_id) AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- FRIENDLY PAIRS TABLE
-- ============================================
CREATE TABLE friendly_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friendly_id UUID REFERENCES friendlies(id) ON DELETE CASCADE NOT NULL,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
    pair_name TEXT NOT NULL,
    player_1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    player_2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(friendly_id, player_1_id, player_2_id)
);

-- Enable RLS
ALTER TABLE friendly_pairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendly_pairs
CREATE POLICY "Friendly pairs viewable by participating club members"
    ON friendly_pairs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM friendlies f
            JOIN memberships m ON m.club_id IN (f.inviting_club_id, f.invited_club_id)
            WHERE f.id = friendly_pairs.friendly_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

CREATE POLICY "Club members can register pairs"
    ON friendly_pairs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM friendlies f
            JOIN memberships m ON m.club_id = friendly_pairs.club_id
            WHERE f.id = friendly_pairs.friendly_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

-- ============================================
-- FRIENDLY MATCHUPS TABLE
-- ============================================
CREATE TABLE friendly_matchups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friendly_id UUID REFERENCES friendlies(id) ON DELETE CASCADE NOT NULL,
    pair_a_id UUID REFERENCES friendly_pairs(id) ON DELETE CASCADE NOT NULL,
    pair_b_id UUID REFERENCES friendly_pairs(id) ON DELETE CASCADE NOT NULL,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'completed')),
    winner_club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(friendly_id, pair_a_id, pair_b_id)
);

-- Enable RLS
ALTER TABLE friendly_matchups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendly_matchups
CREATE POLICY "Friendly matchups viewable by participating club members"
    ON friendly_matchups FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM friendlies f
            JOIN memberships m ON m.club_id IN (f.inviting_club_id, f.invited_club_id)
            WHERE f.id = friendly_matchups.friendly_id
            AND m.user_id = auth.uid()
            AND m.status = 'active'
        )
    );

CREATE POLICY "Club owners can create matchups"
    ON friendly_matchups FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM friendlies f
            JOIN memberships m ON m.club_id IN (f.inviting_club_id, f.invited_club_id)
            WHERE f.id = friendly_matchups.friendly_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- FRIENDLY INVITES TABLE (for analytics)
-- ============================================
CREATE TABLE friendly_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    friendly_id UUID REFERENCES friendlies(id) ON DELETE CASCADE NOT NULL,
    invite_method TEXT NOT NULL CHECK (invite_method IN ('whatsapp', 'link', 'platform')),
    invited_contact TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'clicked', 'converted')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    clicked_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE friendly_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendly_invites
CREATE POLICY "Friendly invites viewable by inviting club owners"
    ON friendly_invites FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM friendlies f
            JOIN memberships m ON m.club_id = f.inviting_club_id
            WHERE f.id = friendly_invites.friendly_id
            AND m.user_id = auth.uid()
            AND m.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_friendlies_inviting_club ON friendlies(inviting_club_id);
CREATE INDEX idx_friendlies_invited_club ON friendlies(invited_club_id);
CREATE INDEX idx_friendlies_status ON friendlies(status);
CREATE INDEX idx_friendlies_invite_code ON friendlies(invite_code);

CREATE INDEX idx_friendly_pairs_friendly ON friendly_pairs(friendly_id);
CREATE INDEX idx_friendly_pairs_club ON friendly_pairs(club_id);

CREATE INDEX idx_friendly_matchups_friendly ON friendly_matchups(friendly_id);
CREATE INDEX idx_friendly_matchups_match ON friendly_matchups(match_id);

CREATE INDEX idx_friendly_invites_friendly ON friendly_invites(friendly_id);

-- ============================================
-- TRIGGER: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_friendly_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        NEW.accepted_at = NOW();
    ELSIF NEW.status = 'matchmaking' AND OLD.status = 'accepted' THEN
        NEW.matchmaking_locked_at = NOW();
    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_friendly_status_change
    BEFORE UPDATE ON friendlies
    FOR EACH ROW EXECUTE FUNCTION update_friendly_status_timestamp();

-- ============================================
-- REALTIME SUBSCRIPTION
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE friendlies;
        ALTER PUBLICATION supabase_realtime ADD TABLE friendly_pairs;
        ALTER PUBLICATION supabase_realtime ADD TABLE friendly_matchups;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
