-- Add RLS policies to allow club admins to insert/update RSVPs for club events
-- This allows admins to manage attendance lists on behalf of users.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_rsvps'
      AND policyname = 'Club admins can insert RSVPs for club events'
  ) THEN
    CREATE POLICY "Club admins can insert RSVPs for club events"
      ON event_rsvps FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = event_rsvps.event_id
            AND private.is_club_admin(e.club_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_rsvps'
      AND policyname = 'Club admins can update RSVPs for club events'
  ) THEN
    CREATE POLICY "Club admins can update RSVPs for club events"
      ON event_rsvps FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = event_rsvps.event_id
            AND private.is_club_admin(e.club_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM events e
          WHERE e.id = event_rsvps.event_id
            AND private.is_club_admin(e.club_id)
        )
      );
  END IF;
END $$;
