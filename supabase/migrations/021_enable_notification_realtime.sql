-- Let the browser notification subscription receive changes for the signed-in user.
-- The subscription is still protected by notification RLS policies.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
