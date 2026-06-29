-- Existing roster invites sent to club owners/admins should not require an
-- Accept/Decline action from the same club's management.

UPDATE public.notifications AS n
SET read = TRUE
WHERE n.type = 'roster_invite'
  AND n.read = FALSE
  AND EXISTS (
    SELECT 1
    FROM public.competition_participants AS cp
    JOIN public.memberships AS m
      ON m.club_id = cp.club_id
     AND m.user_id = n.user_id
     AND m.status = 'active'
     AND m.role IN ('owner', 'admin')
    WHERE cp.id::text = n.data->>'participant_id'
      AND (
        (cp.user_1_id = n.user_id AND cp.user_1_status = 'pending')
        OR (cp.user_2_id = n.user_id AND cp.user_2_status = 'pending')
      )
  );

UPDATE public.competition_participants AS cp
SET user_1_status = 'accepted'
WHERE cp.user_1_status = 'pending'
  AND cp.user_1_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.memberships AS m
    WHERE m.club_id = cp.club_id
      AND m.user_id = cp.user_1_id
      AND m.status = 'active'
      AND m.role IN ('owner', 'admin')
  );

UPDATE public.competition_participants AS cp
SET user_2_status = 'accepted'
WHERE cp.user_2_status = 'pending'
  AND cp.user_2_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.memberships AS m
    WHERE m.club_id = cp.club_id
      AND m.user_id = cp.user_2_id
      AND m.status = 'active'
      AND m.role IN ('owner', 'admin')
  );
