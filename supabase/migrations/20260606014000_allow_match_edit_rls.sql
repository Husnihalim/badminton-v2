-- Add RLS policies to allow match creators (recorders) or club admins to update/delete matches and score sets.

-- 1. Policies for matches (UPDATE and DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'matches' 
    AND policyname = 'Recorders and club admins can update matches'
  ) THEN
    CREATE POLICY "Recorders and club admins can update matches"
      ON public.matches FOR UPDATE
      TO authenticated
      USING (
        recorded_by = auth.uid()
        OR private.is_club_admin(club_id)
      )
      WITH CHECK (
        recorded_by = auth.uid()
        OR private.is_club_admin(club_id)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'matches' 
    AND policyname = 'Recorders and club admins can delete matches'
  ) THEN
    CREATE POLICY "Recorders and club admins can delete matches"
      ON public.matches FOR DELETE
      TO authenticated
      USING (
        recorded_by = auth.uid()
        OR private.is_club_admin(club_id)
      );
  END IF;
END $$;

-- 2. Policies for score_sets (INSERT, UPDATE, DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'score_sets' 
    AND policyname = 'Recorders and club admins can insert score sets'
  ) THEN
    CREATE POLICY "Recorders and club admins can insert score sets"
      ON public.score_sets FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.matches
          WHERE matches.id = score_sets.match_id
            AND (
              matches.recorded_by = auth.uid()
              OR private.is_club_admin(matches.club_id)
            )
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'score_sets' 
    AND policyname = 'Recorders and club admins can update score sets'
  ) THEN
    CREATE POLICY "Recorders and club admins can update score sets"
      ON public.score_sets FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.matches
          WHERE matches.id = score_sets.match_id
            AND (
              matches.recorded_by = auth.uid()
              OR private.is_club_admin(matches.club_id)
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.matches
          WHERE matches.id = score_sets.match_id
            AND (
              matches.recorded_by = auth.uid()
              OR private.is_club_admin(matches.club_id)
            )
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'score_sets' 
    AND policyname = 'Recorders and club admins can delete score sets'
  ) THEN
    CREATE POLICY "Recorders and club admins can delete score sets"
      ON public.score_sets FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.matches
          WHERE matches.id = score_sets.match_id
            AND (
              matches.recorded_by = auth.uid()
              OR private.is_club_admin(matches.club_id)
            )
        )
      );
  END IF;
END $$;
