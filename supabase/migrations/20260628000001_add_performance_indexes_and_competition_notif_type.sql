-- Add composite index for common memberships RLS query pattern
CREATE INDEX IF NOT EXISTS idx_memberships_club_user_status
  ON public.memberships (club_id, user_id, status);

-- Add competition_invite to allowed notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['join_request', 'join_approved', 'event_reminder', 'event_created', 'rsvp_update', 'score_recorded', 'announcement', 'roster_invite', 'competition_invite']));
