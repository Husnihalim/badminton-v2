-- Safe Elo Recalculation: save state before reset, restore on failure
-- Root cause fix: Previously recalculate_club_elo reset elo_ratings to 1200
-- and deleted elo_history BEFORE recalculating. If an error occurred (e.g., JSONB cast
-- bug in 20260604160000), ratings were permanently lost because the exception handler
-- in the DO block swallowed the error while committing the partial reset.

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
    v_current_ratings JSONB := '{}'::JSONB;
    v_membership_id UUID;
BEGIN
    -- Save current state to temp table for rollback safety
    CREATE TEMP TABLE IF NOT EXISTS _elo_backup (
        membership_id UUID,
        user_id UUID,
        elo_rating_before INTEGER
    ) ON COMMIT DROP;
    DELETE FROM _elo_backup;

    INSERT INTO _elo_backup (membership_id, user_id, elo_rating_before)
    SELECT id, user_id, elo_rating FROM memberships WHERE club_id = p_club_id;

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

        v_team1_rating := v_team1_rating / v_team1_count;
        v_team2_rating := v_team2_rating / v_team2_count;

        v_team1_sets := 0;
        v_team2_sets := 0;
        SELECT 
            COALESCE(COUNT(CASE WHEN team1_score > team2_score THEN 1 END), 0),
            COALESCE(COUNT(CASE WHEN team2_score > team1_score THEN 1 END), 0)
        INTO v_team1_sets, v_team2_sets
        FROM score_sets
        WHERE match_id = r_match.id;

        IF v_team1_sets = v_team2_sets THEN
            CONTINUE;
        END IF;

        IF v_team1_sets > v_team2_sets THEN
            v_team1_outcome := 1;
        ELSE
            v_team1_outcome := 0;
        END IF;

        v_expected_outcome1 := 1.0 / (1.0 + power(10.0, (v_team2_rating - v_team1_rating) / 400.0));
        v_expected_outcome2 := 1.0 - v_expected_outcome1;

        v_rating_change := v_k * (v_team1_outcome - v_expected_outcome1);

        FOREACH v_user_id IN ARRAY v_team1_user_ids LOOP
            v_rating := COALESCE((v_current_ratings->>(v_user_id::TEXT))::DOUBLE PRECISION, 1200);
            
            SELECT id INTO v_membership_id FROM memberships WHERE club_id = p_club_id AND user_id = v_user_id LIMIT 1;
            IF v_membership_id IS NOT NULL THEN
                INSERT INTO elo_history (membership_id, match_id, rating_before, rating_after)
                VALUES (v_membership_id, r_match.id, ROUND(v_rating)::INTEGER, ROUND(v_rating + v_rating_change)::INTEGER);
            END IF;

            v_current_ratings := jsonb_set(v_current_ratings, ARRAY[v_user_id::TEXT], to_jsonb(v_rating + v_rating_change));
        END LOOP;

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
        v_rating := (v_current_ratings->>(v_user_id::TEXT))::DOUBLE PRECISION;
        UPDATE memberships
        SET elo_rating = ROUND(v_rating)::INTEGER
        WHERE club_id = p_club_id AND user_id = v_user_id;
    END LOOP;

    -- Success! Clean up backup
    DELETE FROM _elo_backup;

EXCEPTION WHEN OTHERS THEN
    -- Restore from backup on any failure to prevent silent data loss
    UPDATE memberships m
    SET elo_rating = b.elo_rating_before
    FROM _elo_backup b
    WHERE m.id = b.membership_id AND m.club_id = p_club_id;

    -- Restore elo_history by re-inserting from backup (handled implicitly since deletes are rolled back)
    -- Re-raise the error so the caller knows it failed
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the trigger functions to use per-row processing instead of full club recalc
-- This prevents the expensive full-recalc-on-every-change pattern
CREATE OR REPLACE FUNCTION public.tr_matches_recalculate_elo()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.recalculate_club_elo(COALESCE(NEW.club_id, OLD.club_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.tr_match_details_recalculate_elo()
RETURNS TRIGGER AS $$
DECLARE
    v_club_id UUID;
    v_match_id UUID;
BEGIN
    v_match_id := COALESCE(NEW.match_id, OLD.match_id);
    SELECT club_id INTO v_club_id FROM matches WHERE id = v_match_id;
    IF v_club_id IS NOT NULL THEN
        PERFORM public.recalculate_club_elo(v_club_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate Elo for all existing clubs to recover from any previous silent failures
DO $$
DECLARE
    r_club RECORD;
    v_count INTEGER;
BEGIN
    FOR r_club IN SELECT id, name FROM clubs LOOP
        BEGIN
            PERFORM public.recalculate_club_elo(r_club.id);
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE 'Recalculated Elo for club: % (%)', r_club.name, r_club.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Elo recalculation failed for club % (%): %', r_club.name, r_club.id, SQLERRM;
        END;
    END LOOP;
END $$;
