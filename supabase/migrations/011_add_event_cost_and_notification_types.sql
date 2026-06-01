ALTER TABLE events
  ADD COLUMN IF NOT EXISTS cost_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS cost_note TEXT;

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
      'announcement'
    )
  );

ALTER TABLE club_activities
  DROP CONSTRAINT IF EXISTS club_activities_type_check;

ALTER TABLE club_activities
  ADD CONSTRAINT club_activities_type_check
  CHECK (
    type IN (
      'match_recorded',
      'member_joined',
      'event_created',
      'rsvp_update',
      'announcement'
    )
  );
