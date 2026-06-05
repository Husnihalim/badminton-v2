-- Add RLS policies to allow match creators (recorders) or club admins to update/delete matches and score sets.

-- 1. Policies for matches (UPDATE and DELETE)
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

CREATE POLICY "Recorders and club admins can delete matches"
  ON public.matches FOR DELETE
  TO authenticated
  USING (
    recorded_by = auth.uid()
    OR private.is_club_admin(club_id)
  );

-- 2. Policies for score_sets (INSERT, UPDATE, DELETE)
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
