-- Migration to add Elo Rating System to memberships

-- 1. Add elo_rating column to memberships table
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS elo_rating INTEGER NOT NULL DEFAULT 1200;

-- 2. Create elo_history table
CREATE TABLE IF NOT EXISTS elo_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID REFERENCES memberships(id) ON DELETE CASCADE NOT NULL,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    rating_before INTEGER NOT NULL,
    rating_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for elo_history
ALTER TABLE elo_history ENABLE ROW LEVEL SECURITY;

-- Select policy: Viewable by club members
DROP POLICY IF EXISTS "Elo history viewable by active club members" ON elo_history;
CREATE POLICY "Elo history viewable by active club members"
    ON elo_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM memberships m1
            JOIN memberships m2 ON m2.club_id = m1.club_id
            WHERE m1.id = elo_history.membership_id
              AND m2.user_id = auth.uid()
              AND m2.status = 'active'
        )
    );


-- 3. PL/pgSQL function to recalculate Club Elo Ratings
CREATE OR REPLACE FUNCTION public.recalculate_club_elo(p_club_id UUID)
RETURNS VOID AS $$
DECLARE
    r_match RECORD;
    r_part RECORD;
    v_team1_user_ids UUID[] := '{}';
    v_team2_user_ids UUID[] := '{}';
    v_team1_count INTEGER := 0;
    v_team2_count INTEGER := 0;
    v_team1_rating DOUBLE PRECISION := 0;
    v_team2_rating DOUBLE PRECISION := 0;
    v_team1_score INTEGER := 0;
    v_team2_score INTEGER := 0;
    v_team1_sets INTEGER := 0;
    v_team2_sets INTEGER := 0;
    v_team1_outcome DOUBLE PRECISION := 0;
    v_expected_outcome1 DOUBLE PRECISION := 0;
    v_expected_outcome2 DOUBLE PRECISION := 0;
    v_rating_change DOUBLE PRECISION := 0;
    v_k INTEGER := 32;
    v_user_id UUID;
    v_rating DOUBLE PRECISION;
    v_current_ratings JSONB := '{}'::JSONB; -- Key: user_id, Value: current Elo rating
    v_membership_id UUID;
BEGIN
    -- Reset all memberships' elo_rating to 1200 for this club
    UPDATE memberships
    SET elo_rating = 1200
    WHERE club_id = p_club_id;

    -- Clear elo history for this club's matches
    DELETE FROM elo_history
    WHERE match_id IN (SELECT id FROM matches WHERE club_id = p_club_id);

    -- Initialize local ratings map with 1200
    FOR v_user_id IN (SELECT user_id FROM memberships WHERE club_id = p_club_id AND status = 'active') LOOP
        v_current_ratings := jsonb_set(v_current_ratings, ARRAY[v_user_id::TEXT], '1200'::JSONB);
    END LOOP;

    -- Process all matches of this club in chronological order
    FOR r_match IN (
        SELECT m.id, m.match_type
        FROM matches m
        WHERE m.club_id = p_club_id
        ORDER BY m.match_date ASC, m.created_at ASC
    ) LOOP
        -- Retrieve participants and separate by team
        v_team1_user_ids := '{}';
        v_team2_user_ids := '{}';
        v_team1_rating := 0;
        v_team2_rating := 0;
        v_team1_count := 0;
        v_team2_count := 0;

        FOR r_part IN (
            SELECT user_id, team, is_guest
            FROM match_participants
            WHERE match_id = r_match.id
        ) LOOP
            -- Determine rating
            v_rating := 1200;
            IF NOT r_part.is_guest AND r_part.user_id IS NOT NULL THEN
                v_rating := COALESCE((v_current_ratings->>(r_part.user_id::TEXT))::DOUBLE PRECISION, 1200);
            END IF;

            IF r_part.team = 1 THEN
                v_team1_count := v_team1_count + 1;
                v_team1_rating := v_team1_rating + v_rating;
                IF NOT r_part.is_guest AND r_part.user_id IS NOT NULL THEN
                    v_team1_user_ids := array_append(v_team1_user_ids, r_part.user_id);
                END IF;
            ELSE
                v_team2_count := v_team2_count + 1;
                v_team2_rating := v_team2_rating + v_rating;
                IF NOT r_part.is_guest AND r_part.user_id IS NOT NULL THEN
                    v_team2_user_ids := array_append(v_team2_user_ids, r_part.user_id);
                END IF;
            END IF;
        END LOOP;

        IF v_team1_count = 0 OR v_team2_count = 0 THEN
            CONTINUE;
        END IF;

        -- Average team ratings
        v_team1_rating := v_team1_rating / v_team1_count;
        v_team2_rating := v_team2_rating / v_team2_count;

        -- Calculate sets won
        v_team1_sets := 0;
        v_team2_sets := 0;
        SELECT 
            COALESCE(COUNT(CASE WHEN team1_score > team2_score THEN 1 END), 0),
            COALESCE(COUNT(CASE WHEN team2_score > team1_score THEN 1 END), 0)
        INTO v_team1_sets, v_team2_sets
        FROM score_sets
        WHERE match_id = r_match.id;

        IF v_team1_sets = v_team2_sets THEN
            CONTINUE; -- Ignore draws
        END IF;

        IF v_team1_sets > v_team2_sets THEN
            v_team1_outcome := 1;
        ELSE
            v_team1_outcome := 0;
        END IF;

        -- Expected outcomes
        v_expected_outcome1 := 1.0 / (1.0 + power(10.0, (v_team2_rating - v_team1_rating) / 400.0));
        v_expected_outcome2 := 1.0 - v_expected_outcome1;

        -- Rating change
        v_rating_change := v_k * (v_team1_outcome - v_expected_outcome1);

        -- Apply rating changes for Team 1
        FOREACH v_user_id IN ARRAY v_team1_user_ids LOOP
            v_rating := COALESCE((v_current_ratings->>(v_user_id::TEXT))::DOUBLE PRECISION, 1200);
            
            SELECT id INTO v_membership_id FROM memberships WHERE club_id = p_club_id AND user_id = v_user_id LIMIT 1;
            IF v_membership_id IS NOT NULL THEN
                INSERT INTO elo_history (membership_id, match_id, rating_before, rating_after)
                VALUES (v_membership_id, r_match.id, ROUND(v_rating)::INTEGER, ROUND(v_rating + v_rating_change)::INTEGER);
            END IF;

            v_current_ratings := jsonb_set(v_current_ratings, ARRAY[v_user_id::TEXT], to_jsonb(v_rating + v_rating_change));
        END LOOP;

        -- Apply rating changes for Team 2
        FOREACH v_user_id IN ARRAY v_team2_user_ids LOOP
            v_rating := COALESCE((v_current_ratings->>(v_user_id::TEXT))::DOUBLE PRECISION, 1200);
            
            SELECT id INTO v_membership_id FROM memberships WHERE club_id = p_club_id AND user_id = v_user_id LIMIT 1;
            IF v_membership_id IS NOT NULL THEN
                INSERT INTO elo_history (membership_id, match_id, rating_before, rating_after)
                VALUES (v_membership_id, r_match.id, ROUND(v_rating)::INTEGER, ROUND(v_rating - v_rating_change)::INTEGER);
            END IF;

            v_current_ratings := jsonb_set(v_current_ratings, ARRAY[v_user_id::TEXT], to_jsonb(v_rating - v_rating_change));
        END LOOP;
    END LOOP;

    -- Persist the final ratings in the memberships table
    FOR v_user_id IN (SELECT jsonb_object_keys(v_current_ratings)) LOOP
        v_rating := (v_current_ratings->>(v_user_id))::DOUBLE PRECISION;
        UPDATE memberships
        SET elo_rating = ROUND(v_rating)::INTEGER
        WHERE club_id = p_club_id AND user_id = v_user_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to run recalculate_club_elo on match updates/inserts/deletions
CREATE OR REPLACE FUNCTION public.tr_matches_recalculate_elo()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.recalculate_club_elo(OLD.club_id);
        RETURN OLD;
    ELSE
        PERFORM public.recalculate_club_elo(NEW.club_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_change_recalculate_elo ON matches;

CREATE TRIGGER on_match_change_recalculate_elo
    AFTER INSERT OR UPDATE OR DELETE ON matches
    FOR EACH ROW EXECUTE FUNCTION public.tr_matches_recalculate_elo();

-- 5. Add triggers for match_participants and score_sets updates too
-- (If participants or scores change, recalculate the club's Elo rating)
CREATE OR REPLACE FUNCTION public.tr_match_details_recalculate_elo()
RETURNS TRIGGER AS $$
DECLARE
    v_club_id UUID;
    v_match_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_match_id := OLD.match_id;
    ELSE
        v_match_id := NEW.match_id;
    END IF;

    SELECT club_id INTO v_club_id FROM matches WHERE id = v_match_id;
    IF v_club_id IS NOT NULL THEN
        PERFORM public.recalculate_club_elo(v_club_id);
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_participant_change_recalculate_elo ON match_participants;
CREATE TRIGGER on_participant_change_recalculate_elo
    AFTER INSERT OR UPDATE OR DELETE ON match_participants
    FOR EACH ROW EXECUTE FUNCTION public.tr_match_details_recalculate_elo();

DROP TRIGGER IF EXISTS on_score_set_change_recalculate_elo ON score_sets;
CREATE TRIGGER on_score_set_change_recalculate_elo
    AFTER INSERT OR UPDATE OR DELETE ON score_sets
    FOR EACH ROW EXECUTE FUNCTION public.tr_match_details_recalculate_elo();

-- 6. Add to Realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE elo_history;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 7. Recalculate Elo ratings for all existing clubs
DO $$
DECLARE
    r_club RECORD;
BEGIN
    FOR r_club IN (SELECT id FROM clubs) LOOP
        BEGIN
            PERFORM public.recalculate_club_elo(r_club.id);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore single club errors during migration seed
            NULL;
        END;
    END LOOP;
END $$;
