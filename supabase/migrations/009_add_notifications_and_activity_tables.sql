-- Tables used by the notification header and club activity feed.

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (
      type IN ('join_request', 'join_approved', 'event_reminder', 'score_recorded', 'announcement')
    ),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE TABLE IF NOT EXISTS club_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (
      type IN ('match_recorded', 'member_joined', 'event_created', 'announcement')
    ),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE club_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club activities viewable by active club members" ON club_activities;
DROP POLICY IF EXISTS "Active club members can create club activities" ON club_activities;

CREATE POLICY "Club activities viewable by active club members"
    ON club_activities FOR SELECT
    TO authenticated
    USING (private.is_active_club_member(club_id));

CREATE POLICY "Active club members can create club activities"
    ON club_activities FOR INSERT
    TO authenticated
    WITH CHECK (private.is_active_club_member(club_id));

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_activities_club_id ON club_activities(club_id);
CREATE INDEX IF NOT EXISTS idx_club_activities_created_at ON club_activities(created_at DESC);
