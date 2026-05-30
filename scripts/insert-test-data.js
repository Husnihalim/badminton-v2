// Test Data Insertion Script
// Run this in browser console after creating test accounts

// Instructions:
// 1. Register 4 test accounts via the app
// 2. Get their user IDs from Supabase dashboard
// 3. Replace the UUIDs below
// 4. Run this SQL in Supabase SQL Editor

const testDataSQL = `
-- ============================================
-- INSERT TEST DATA
-- Run this after creating test users
-- ============================================

-- Replace these with actual user IDs from your Supabase auth.users table
-- You can find them at: https://supabase.com/dashboard/project/yjetickebgngfttlvvur/auth/users

DO $$
DECLARE
    superadmin_id UUID := 'REPLACE_WITH_SUPERADMIN_UUID';
    owner_id UUID := 'REPLACE_WITH_OWNER_UUID';
    admin_id UUID := 'REPLACE_WITH_ADMIN_UUID';
    member_id UUID := 'REPLACE_WITH_MEMBER_UUID';
    club1_id UUID := '11111111-1111-1111-1111-111111111111';
    club2_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
    -- Only proceed if we have valid UUIDs
    IF superadmin_id = 'REPLACE_WITH_SUPERADMIN_UUID' THEN
        RAISE NOTICE 'Please replace placeholder UUIDs with actual user IDs';
        RETURN;
    END IF;

    -- Create clubs
    INSERT INTO clubs (id, name, description, location, city, sport_focus, open_join, approval_required, owner_id)
    VALUES 
        (club1_id, 'Kuala Lumpur Badminton Club', 'Open club for all badminton enthusiasts', 'KL Sports Center', 'Kuala Lumpur', ARRAY['badminton'], true, false, owner_id),
        (club2_id, 'Elite Tennis Academy', 'Professional tennis training club', 'Bukit Jalil', 'Kuala Lumpur', ARRAY['tennis'], true, true, owner_id)
    ON CONFLICT (id) DO NOTHING;

    -- Add admin to club1
    INSERT INTO memberships (club_id, user_id, role, status)
    VALUES (club1_id, admin_id, 'admin', 'active')
    ON CONFLICT (club_id, user_id) DO NOTHING;

    -- Add regular member to club1
    INSERT INTO memberships (club_id, user_id, role, status)
    VALUES (club1_id, member_id, 'member', 'active')
    ON CONFLICT (club_id, user_id) DO NOTHING;

    -- Create events
    INSERT INTO events (club_id, title, event_date, location, max_participants, signup_open, created_by)
    VALUES 
        (club1_id, 'Wednesday Night Games', NOW() + INTERVAL '2 days', 'Court A', 20, true, owner_id),
        (club1_id, 'Weekend Tournament', NOW() + INTERVAL '5 days', 'Main Hall', 32, true, owner_id),
        (club2_id, 'Tennis Training Camp', NOW() + INTERVAL '3 days', 'Court 1', 12, true, owner_id)
    ON CONFLICT DO NOTHING;

    -- Create matches
    INSERT INTO matches (club_id, title, sport, match_type, recorded_by, match_date)
    VALUES 
        (club1_id, 'Ali vs Ahmad', 'badminton', 'singles', owner_id, NOW() - INTERVAL '2 days'),
        (club1_id, 'Team A vs Team B', 'badminton', 'doubles', owner_id, NOW() - INTERVAL '1 day'),
        (club2_id, 'Singles Practice', 'tennis', 'singles', owner_id, NOW() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Test data inserted successfully!';
END $$;
`;

console.log('Copy this SQL and run it in Supabase SQL Editor:');
console.log('==============================================');
console.log(testDataSQL);
console.log('==============================================');
console.log('');
console.log('To get user UUIDs:');
console.log('1. Go to https://supabase.com/dashboard/project/yjetickebgngfttlvvur/auth/users');
console.log('2. Copy the UUID for each test user');
console.log('3. Replace the placeholder UUIDs in the SQL above');
console.log('4. Run the SQL in the SQL Editor');
