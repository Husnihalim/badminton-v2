-- Migration to add Match Reactions and Comments

-- ============================================
-- MATCH REACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS match_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reaction TEXT NOT NULL CHECK (reaction IN ('🔥','😱','💪','😢','👏','🎯')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, user_id, reaction)
);

ALTER TABLE match_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reactions viewable by active club members" ON match_reactions;
CREATE POLICY "Reactions viewable by active club members"
    ON match_reactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = match_reactions.match_id
              AND private.is_active_club_member(m.club_id)
        )
    );

DROP POLICY IF EXISTS "Users can create their own reactions" ON match_reactions;
CREATE POLICY "Users can create their own reactions"
    ON match_reactions FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = match_id
              AND private.is_active_club_member(m.club_id)
        )
    );

DROP POLICY IF EXISTS "Users can delete their own reactions" ON match_reactions;
CREATE POLICY "Users can delete their own reactions"
    ON match_reactions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- ============================================
-- MATCH COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS match_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 280),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments viewable by active club members" ON match_comments;
CREATE POLICY "Comments viewable by active club members"
    ON match_comments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = match_comments.match_id
              AND private.is_active_club_member(m.club_id)
        )
    );

DROP POLICY IF EXISTS "Users can create their own comments" ON match_comments;
CREATE POLICY "Users can create their own comments"
    ON match_comments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = match_id
              AND private.is_active_club_member(m.club_id)
        )
    );

DROP POLICY IF EXISTS "Users or admins can update/delete comments" ON match_comments;
CREATE POLICY "Users or admins can update/delete comments"
    ON match_comments FOR ALL
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM matches m
            JOIN memberships ms ON ms.club_id = m.club_id
            WHERE m.id = match_comments.match_id
              AND ms.user_id = auth.uid()
              AND ms.role IN ('owner', 'admin')
              AND ms.status = 'active'
        )
    );


-- ============================================
-- ADD TO REALTIME PUBLICATION
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE match_reactions;
    ALTER PUBLICATION supabase_realtime ADD TABLE match_comments;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_reactions_match_id ON match_reactions(match_id);
CREATE INDEX IF NOT EXISTS idx_match_comments_match_id ON match_comments(match_id);
