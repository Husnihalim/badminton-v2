-- KelabSukan Roster Invite Status & Notifications Types
-- Migration: Add invitation status to participants and alter notifications check constraint

-- 1. Alter notifications check constraint to allow 'roster_invite'
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type IN (
      'join_request',
      'join_approved',
      'event_reminder',
      'event_created',
      'rsvp_update',
      'score_recorded',
      'announcement',
      'roster_invite'
    )
  );

-- 2. Add invitation status columns to competition_participants
ALTER TABLE competition_participants
  ADD COLUMN IF NOT EXISTS user_1_status TEXT NOT NULL DEFAULT 'accepted' CHECK (user_1_status IN ('pending', 'accepted', 'declined')),
  ADD COLUMN IF NOT EXISTS user_2_status TEXT NOT NULL DEFAULT 'accepted' CHECK (user_2_status IN ('pending', 'accepted', 'declined'));

-- 3. Ensure index for performance
CREATE INDEX IF NOT EXISTS idx_comp_participants_user_1_status ON competition_participants(user_1_id, user_1_status);
CREATE INDEX IF NOT EXISTS idx_comp_participants_user_2_status ON competition_participants(user_2_id, user_2_status);

-- 4. Enable Realtime updates for notifications table if not already added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
