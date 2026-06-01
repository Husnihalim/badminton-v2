CREATE TABLE IF NOT EXISTS club_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'club_messages'
      AND policyname = 'Club members can view messages'
  ) THEN
    CREATE POLICY "Club members can view messages"
      ON club_messages FOR SELECT
      TO authenticated
      USING (private.is_active_club_member(club_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'club_messages'
      AND policyname = 'Club admins can create messages'
  ) THEN
    CREATE POLICY "Club admins can create messages"
      ON club_messages FOR INSERT
      TO authenticated
      WITH CHECK (private.is_club_admin(club_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'club_messages'
      AND policyname = 'Club admins can update messages'
  ) THEN
    CREATE POLICY "Club admins can update messages"
      ON club_messages FOR UPDATE
      TO authenticated
      USING (private.is_club_admin(club_id))
      WITH CHECK (private.is_club_admin(club_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'club_messages'
      AND policyname = 'Club admins can delete messages'
  ) THEN
    CREATE POLICY "Club admins can delete messages"
      ON club_messages FOR DELETE
      TO authenticated
      USING (private.is_club_admin(club_id));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_club_messages_updated_at ON club_messages;
CREATE TRIGGER update_club_messages_updated_at
  BEFORE UPDATE ON club_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_club_messages_club_id ON club_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_club_messages_created_at ON club_messages(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'Club admins can update events'
  ) THEN
    CREATE POLICY "Club admins can update events"
      ON events FOR UPDATE
      TO authenticated
      USING (private.is_club_admin(club_id))
      WITH CHECK (private.is_club_admin(club_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'Club admins can delete events'
  ) THEN
    CREATE POLICY "Club admins can delete events"
      ON events FOR DELETE
      TO authenticated
      USING (private.is_club_admin(club_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Club admins can update club notifications'
  ) THEN
    CREATE POLICY "Club admins can update club notifications"
      ON notifications FOR UPDATE
      TO authenticated
      USING (
        jsonb_typeof(data) = 'object'
        AND data ? 'clubId'
        AND private.is_club_admin((data->>'clubId')::uuid)
      )
      WITH CHECK (
        jsonb_typeof(data) = 'object'
        AND data ? 'clubId'
        AND private.is_club_admin((data->>'clubId')::uuid)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Club admins can delete club notifications'
  ) THEN
    CREATE POLICY "Club admins can delete club notifications"
      ON notifications FOR DELETE
      TO authenticated
      USING (
        jsonb_typeof(data) = 'object'
        AND data ? 'clubId'
        AND private.is_club_admin((data->>'clubId')::uuid)
      );
  END IF;
END $$;
