-- Seed data for testing KelabSukan
-- Run this in Supabase SQL Editor after the main schema is set up

-- ============================================
-- TEST PROFILES
-- ============================================

-- Note: These will be created automatically when users sign up via auth
-- But we can insert them directly for testing if auth.users exist

-- Create test users in auth.users first (this requires auth admin)
-- For manual testing, register these accounts via the app:

-- Test Account 1: Super Admin
-- Email: superadmin@test.com
-- Password: Test123!
-- Name: Super Admin

-- Test Account 2: Club Owner  
-- Email: owner@test.com
-- Password: Test123!
-- Name: Club Owner

-- Test Account 3: Club Admin
-- Email: admin@test.com  
-- Password: Test123!
-- Name: Club Admin

-- Test Account 4: Regular Member
-- Email: member@test.com
-- Password: Test123!
-- Name: Regular Member

-- ============================================
-- SEED AUTH USER FOR OWNER
-- ============================================

INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'owner@test.com',
    '$2a$10$abcdefghijklmnopqrstuv',
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Club Owner", "role": "owner"}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED CLUBS (will be created after users exist)
-- ============================================

-- Club 1: Open Join Club
INSERT INTO clubs (
    id,
    name, 
    description, 
    location, 
    city, 
    sport_focus, 
    open_join, 
    approval_required, 
    owner_id,
    created_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Test Open Club',
    'A test club with open membership. Anyone can join instantly.',
    'Community Center Court',
    'Kuala Lumpur',
    ARRAY['badminton', 'pickleball'],
    true,
    false,
    '00000000-0000-0000-0000-000000000001', -- Replace with actual owner UUID
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Club 2: Approval Required Club
INSERT INTO clubs (
    id,
    name, 
    description, 
    location, 
    city, 
    sport_focus, 
    open_join, 
    approval_required, 
    owner_id,
    created_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Test Approval Club',
    'A test club requiring admin approval for new members.',
    'Elite Sports Complex',
    'Kuala Lumpur',
    ARRAY['badminton', 'tennis'],
    true,
    true,
    '00000000-0000-0000-0000-000000000001', -- Replace with actual owner UUID
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Club 3: Invite Only Club
INSERT INTO clubs (
    id,
    name, 
    description, 
    location, 
    city, 
    sport_focus, 
    open_join, 
    approval_required, 
    invite_code,
    owner_id,
    created_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Test Invite Club',
    'A private test club. Invite code required to join.',
    'Private Court A',
    'Kuala Lumpur',
    ARRAY['badminton'],
    false,
    true,
    'VIP2024',
    '00000000-0000-0000-0000-000000000001', -- Replace with actual owner UUID
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED EVENTS
-- ============================================

INSERT INTO events (
    club_id,
    title,
    event_date,
    location,
    max_participants,
    signup_open,
    created_by,
    created_at
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'Wednesday Singles Night',
    NOW() + INTERVAL '3 days',
    'Court 1',
    20,
    true,
    '00000000-0000-0000-0000-000000000001',
    NOW()
),
(
    '11111111-1111-1111-1111-111111111111',
    'Weekend Doubles Tournament',
    NOW() + INTERVAL '7 days',
    'Main Hall',
    32,
    true,
    '00000000-0000-0000-0000-000000000001',
    NOW()
),
(
    '22222222-2222-2222-2222-222222222222',
    'Beginner Training Session',
    NOW() + INTERVAL '2 days',
    'Training Court',
    12,
    true,
    '00000000-0000-0000-0000-000000000001',
    NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- SEED MATCHES
-- ============================================

INSERT INTO matches (
    club_id,
    title,
    sport,
    match_type,
    recorded_by,
    match_date,
    created_at
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'Ahmad vs Kumar',
    'badminton',
    'singles',
    '00000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    '11111111-1111-1111-1111-111111111111',
    'Team A vs Team B',
    'badminton',
    'doubles',
    '00000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Friendly Match',
    'tennis',
    'singles',
    '00000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
) ON CONFLICT DO NOTHING;

-- ============================================
-- SEED SCORE SETS
-- ============================================

-- Get match IDs and insert scores
DO $$
DECLARE
    match1_id UUID;
    match2_id UUID;
    match3_id UUID;
BEGIN
    -- Get the match IDs we just created
    SELECT id INTO match1_id FROM matches WHERE title = 'Ahmad vs Kumar' LIMIT 1;
    SELECT id INTO match2_id FROM matches WHERE title = 'Team A vs Team B' LIMIT 1;
    SELECT id INTO match3_id FROM matches WHERE title = 'Friendly Match' LIMIT 1;

    -- Insert scores for match 1 (singles)
    IF match1_id IS NOT NULL THEN
        INSERT INTO score_sets (match_id, set_number, team1_score, team2_score)
        VALUES 
            (match1_id, 1, 21, 18),
            (match1_id, 2, 19, 21),
            (match1_id, 3, 21, 15)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert scores for match 2 (doubles)
    IF match2_id IS NOT NULL THEN
        INSERT INTO score_sets (match_id, set_number, team1_score, team2_score)
        VALUES 
            (match2_id, 1, 21, 17),
            (match2_id, 2, 21, 19)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert scores for match 3 (tennis)
    IF match3_id IS NOT NULL THEN
        INSERT INTO score_sets (match_id, set_number, team1_score, team2_score)
        VALUES 
            (match3_id, 1, 6, 4),
            (match3_id, 2, 4, 6),
            (match3_id, 3, 6, 3)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- SEED MATCH PARTICIPANTS
-- ============================================

DO $$
DECLARE
    match1_id UUID;
    match2_id UUID;
    match3_id UUID;
BEGIN
    SELECT id INTO match1_id FROM matches WHERE title = 'Ahmad vs Kumar' LIMIT 1;
    SELECT id INTO match2_id FROM matches WHERE title = 'Team A vs Team B' LIMIT 1;
    SELECT id INTO match3_id FROM matches WHERE title = 'Friendly Match' LIMIT 1;

    -- Match 1 participants (singles with guest players)
    IF match1_id IS NOT NULL THEN
        INSERT INTO match_participants (match_id, team, is_guest, guest_name)
        VALUES 
            (match1_id, 1, true, 'Ahmad'),
            (match1_id, 2, true, 'Kumar')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Match 2 participants (doubles)
    IF match2_id IS NOT NULL THEN
        INSERT INTO match_participants (match_id, team, is_guest, guest_name)
        VALUES 
            (match2_id, 1, true, 'Player A1'),
            (match2_id, 1, true, 'Player A2'),
            (match2_id, 2, true, 'Player B1'),
            (match2_id, 2, true, 'Player B2')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Match 3 participants
    IF match3_id IS NOT NULL THEN
        INSERT INTO match_participants (match_id, team, is_guest, guest_name)
        VALUES 
            (match3_id, 1, true, 'Tennis Player 1'),
            (match3_id, 2, true, 'Tennis Player 2')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Run this to verify seed data:
-- SELECT * FROM clubs;
-- SELECT * FROM events;
-- SELECT * FROM matches;
-- SELECT * FROM score_sets;
