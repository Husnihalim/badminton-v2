-- Fix: Create tables in correct order
-- Run this if you get "relation does not exist" errors

-- First, drop everything if exists (clean slate)
DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS score_sets CASCADE;
DROP TABLE IF EXISTS match_participants CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS join_requests CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_club() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('superadmin', 'owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" 
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- 2. CLUBS TABLE
-- ============================================
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    city TEXT,
    sport_focus TEXT[] DEFAULT '{}',
    open_join BOOLEAN DEFAULT true,
    approval_required BOOLEAN DEFAULT false,
    invite_code TEXT UNIQUE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clubs are viewable by everyone" 
    ON clubs FOR SELECT USING (true);

CREATE POLICY "Clubs can be created by authenticated users" 
    ON clubs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Clubs can be updated by owner" 
    ON clubs FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Clubs can be deleted by owner" 
    ON clubs FOR DELETE USING (auth.uid() = owner_id);

-- ============================================
-- 3. MEMBERSHIPS TABLE
-- ============================================
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES auth.users(id),
    UNIQUE(club_id, user_id)
);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memberships viewable by club members" 
    ON memberships FOR SELECT USING (
        auth.uid() = user_id 
        OR auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id = memberships.club_id AND status = 'active'
        )
    );

CREATE POLICY "Memberships can be created by club admins" 
    ON memberships FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id = memberships.club_id AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- 4. JOIN REQUESTS TABLE
-- ============================================
CREATE TABLE join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(club_id, user_id)
);

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own join requests" 
    ON join_requests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Club admins can view join requests" 
    ON join_requests FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id = join_requests.club_id AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Authenticated users can create join requests" 
    ON join_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Club admins can update join requests" 
    ON join_requests FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id = join_requests.club_id AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- 5. MATCHES TABLE
-- ============================================
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    sport TEXT NOT NULL,
    match_type TEXT NOT NULL CHECK (match_type IN ('singles', 'doubles')),
    recorded_by UUID REFERENCES auth.users(id) NOT NULL,
    match_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches viewable by club members" 
    ON matches FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id = matches.club_id AND status = 'active'
        )
    );

CREATE POLICY "Club members can create matches" 
    ON matches FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id = matches.club_id AND status = 'active'
        )
    );

-- ============================================
-- 6. MATCH PARTICIPANTS TABLE
-- ============================================
CREATE TABLE match_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    team INTEGER NOT NULL CHECK (team IN (1, 2)),
    is_guest BOOLEAN DEFAULT false,
    guest_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match participants viewable by club members" 
    ON match_participants FOR SELECT USING (
        auth.uid() IN (
            SELECT mp.user_id FROM memberships mp
            JOIN matches m ON mp.club_id = m.club_id
            WHERE m.id = match_participants.match_id AND mp.status = 'active'
        )
    );

-- ============================================
-- 7. SCORE SETS TABLE
-- ============================================
CREATE TABLE score_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    set_number INTEGER NOT NULL,
    team1_score INTEGER NOT NULL,
    team2_score INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, set_number)
);

ALTER TABLE score_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Score sets viewable by club members" 
    ON score_sets FOR SELECT USING (
        auth.uid() IN (
            SELECT mp.user_id FROM memberships mp
            JOIN matches m ON mp.club_id = m.club_id
            WHERE m.id = score_sets.match_id AND mp.status = 'active'
        )
    );

-- ============================================
-- 8. EVENTS TABLE
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    max_participants INTEGER,
    signup_open BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events viewable by everyone" 
    ON events FOR SELECT USING (true);

CREATE POLICY "Events can be created by club admins" 
    ON events FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM memberships 
            WHERE club_id = events.club_id AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- 9. EVENT RSVPS TABLE
-- ============================================
CREATE TABLE event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own RSVPs" 
    ON event_rsvps FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create/update their own RSVPs" 
    ON event_rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'member')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to auto-create owner membership when club is created
CREATE OR REPLACE FUNCTION handle_new_club()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO memberships (club_id, user_id, role, status)
    VALUES (NEW.id, NEW.owner_id, 'owner', 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_club_created
    AFTER INSERT ON clubs
    FOR EACH ROW EXECUTE FUNCTION handle_new_club();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_join_requests_updated_at BEFORE UPDATE ON join_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_rsvps_updated_at BEFORE UPDATE ON event_rsvps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_memberships_club_id ON memberships(club_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_join_requests_club_id ON join_requests(club_id);
CREATE INDEX idx_join_requests_user_id ON join_requests(user_id);
CREATE INDEX idx_matches_club_id ON matches(club_id);
CREATE INDEX idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX idx_score_sets_match_id ON score_sets(match_id);
CREATE INDEX idx_events_club_id ON events(club_id);
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);
