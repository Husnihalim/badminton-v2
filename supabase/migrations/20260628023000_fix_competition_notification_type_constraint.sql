-- Keep both invite and update competition notification types valid.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['join_request', 'join_approved', 'event_reminder', 'event_created', 'rsvp_update', 'score_recorded', 'announcement', 'roster_invite', 'competition_invite', 'competition_update']));
