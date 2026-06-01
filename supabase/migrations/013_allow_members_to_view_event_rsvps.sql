DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_rsvps'
      AND policyname = 'Club members can view event RSVPs'
  ) THEN
    CREATE POLICY "Club members can view event RSVPs"
      ON event_rsvps FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM events e
          JOIN memberships m ON m.club_id = e.club_id
          WHERE e.id = event_rsvps.event_id
            AND m.user_id = (select auth.uid())
            AND m.status = 'active'
        )
      );
  END IF;
END $$;
