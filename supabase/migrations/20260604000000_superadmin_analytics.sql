-- Migration: Superadmin Analytics & Monitoring Tables, RLS Policies, and RPCs
-- Created: 2026-06-04

-- ----------------------------------------------------
-- 1. Create New Tables for Logging, Crashes & Feedback
-- ----------------------------------------------------

-- Platform Logs Table
CREATE TABLE IF NOT EXISTS public.platform_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index logs for fast sorting/filtering
CREATE INDEX IF NOT EXISTS idx_platform_logs_created_at ON public.platform_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_logs_event_type ON public.platform_logs(event_type);

-- Crash Reports Table
CREATE TABLE IF NOT EXISTS public.crash_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  error_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index crashes
CREATE INDEX IF NOT EXISTS idx_crash_reports_created_at ON public.crash_reports(created_at DESC);

-- User Feedback Table
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'suggestion', 'other')),
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);


-- ----------------------------------------------------
-- 2. Row Level Security (RLS) Enablement
-- ----------------------------------------------------

ALTER TABLE public.platform_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------
-- 3. RLS Policies
-- ----------------------------------------------------

-- Platform Logs Policies
DROP POLICY IF EXISTS "Anyone can insert platform logs" ON public.platform_logs;
CREATE POLICY "Anyone can insert platform logs"
  ON public.platform_logs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Superadmins can view all platform logs" ON public.platform_logs;
CREATE POLICY "Superadmins can view all platform logs"
  ON public.platform_logs FOR SELECT
  TO authenticated
  USING (private.is_platform_superadmin());

-- Crash Reports Policies
DROP POLICY IF EXISTS "Anyone can insert crash reports" ON public.crash_reports;
CREATE POLICY "Anyone can insert crash reports"
  ON public.crash_reports FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Superadmins can view all crash reports" ON public.crash_reports;
CREATE POLICY "Superadmins can view all crash reports"
  ON public.crash_reports FOR SELECT
  TO authenticated
  USING (private.is_platform_superadmin());

-- User Feedback Policies
DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.user_feedback;
CREATE POLICY "Authenticated users can submit feedback"
  ON public.user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.user_feedback;
CREATE POLICY "Users can view their own feedback"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can manage feedback" ON public.user_feedback;
CREATE POLICY "Superadmins can manage feedback"
  ON public.user_feedback FOR ALL
  TO authenticated
  USING (private.is_platform_superadmin());


-- ----------------------------------------------------
-- 4. Enable Superadmin SELECT/WRITE Across All Tables
-- ----------------------------------------------------

-- Memberships
DROP POLICY IF EXISTS "Superadmins can view all memberships" ON public.memberships;
CREATE POLICY "Superadmins can view all memberships"
  ON public.memberships FOR SELECT TO authenticated
  USING (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can insert memberships" ON public.memberships;
CREATE POLICY "Superadmins can insert memberships"
  ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can update memberships" ON public.memberships;
CREATE POLICY "Superadmins can update memberships"
  ON public.memberships FOR UPDATE TO authenticated
  USING (private.is_platform_superadmin())
  WITH CHECK (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can delete memberships" ON public.memberships;
CREATE POLICY "Superadmins can delete memberships"
  ON public.memberships FOR DELETE TO authenticated
  USING (private.is_platform_superadmin());

-- Join Requests
DROP POLICY IF EXISTS "Superadmins can view all join requests" ON public.join_requests;
CREATE POLICY "Superadmins can view all join requests"
  ON public.join_requests FOR SELECT TO authenticated
  USING (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can update all join requests" ON public.join_requests;
CREATE POLICY "Superadmins can update all join requests"
  ON public.join_requests FOR UPDATE TO authenticated
  USING (private.is_platform_superadmin())
  WITH CHECK (private.is_platform_superadmin());

-- Matches & Participants & Score Sets
DROP POLICY IF EXISTS "Superadmins can view all matches" ON public.matches;
CREATE POLICY "Superadmins can view all matches"
  ON public.matches FOR SELECT TO authenticated
  USING (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can delete matches" ON public.matches;
CREATE POLICY "Superadmins can delete matches"
  ON public.matches FOR DELETE TO authenticated
  USING (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can view all match participants" ON public.match_participants;
CREATE POLICY "Superadmins can view all match participants"
  ON public.match_participants FOR SELECT TO authenticated
  USING (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can view all score sets" ON public.score_sets;
CREATE POLICY "Superadmins can view all score sets"
  ON public.score_sets FOR SELECT TO authenticated
  USING (private.is_platform_superadmin());

-- Events & RSVPs
DROP POLICY IF EXISTS "Superadmins can update events" ON public.events;
CREATE POLICY "Superadmins can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (private.is_platform_superadmin())
  WITH CHECK (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can delete events" ON public.events;
CREATE POLICY "Superadmins can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can view all event RSVPs" ON public.event_rsvps;
CREATE POLICY "Superadmins can view all event RSVPs"
  ON public.event_rsvps FOR SELECT TO authenticated
  USING (private.is_platform_superadmin());

-- Notifications & Activities & Messages
DROP POLICY IF EXISTS "Superadmins can view all notifications" ON public.notifications;
CREATE POLICY "Superadmins can view all notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can view all club activities" ON public.club_activities;
CREATE POLICY "Superadmins can view all club activities"
  ON public.club_activities FOR SELECT TO authenticated
  USING (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can view all club messages" ON public.club_messages;
CREATE POLICY "Superadmins can view all club messages"
  ON public.club_messages FOR SELECT TO authenticated
  USING (private.is_platform_superadmin());

-- Profiles & Clubs
DROP POLICY IF EXISTS "Superadmins can update all profiles" ON public.profiles;
CREATE POLICY "Superadmins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (private.is_platform_superadmin())
  WITH CHECK (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can update all clubs" ON public.clubs;
CREATE POLICY "Superadmins can update all clubs"
  ON public.clubs FOR UPDATE TO authenticated
  USING (private.is_platform_superadmin())
  WITH CHECK (private.is_platform_superadmin());

DROP POLICY IF EXISTS "Superadmins can delete all clubs" ON public.clubs;
CREATE POLICY "Superadmins can delete all clubs"
  ON public.clubs FOR DELETE TO authenticated
  USING (private.is_platform_superadmin());


-- ----------------------------------------------------
-- 5. platform_admins Trigger to Sync Profiles
-- ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_platform_admin_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles
    SET role = NEW.role
    WHERE lower(email) = lower(NEW.email);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET role = 'member'
    WHERE lower(email) = lower(OLD.email);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_platform_admin_change ON public.platform_admins;
CREATE TRIGGER on_platform_admin_change
  AFTER INSERT OR UPDATE OR DELETE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.handle_platform_admin_change();


-- ----------------------------------------------------
-- 6. Helper Security Definer RPCs for Superadmin Panel
-- ----------------------------------------------------

-- RPC: Get Dashboard Statistics Summary
CREATE OR REPLACE FUNCTION public.get_superadmin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  tot_users INTEGER;
  tot_clubs INTEGER;
  tot_matches INTEGER;
  tot_events INTEGER;
  tot_rsvps INTEGER;
  tot_crashes INTEGER;
  tot_feedback INTEGER;
  sports_dist JSONB;
  reg_trend JSONB;
  match_trend JSONB;
  crash_trend JSONB;
BEGIN
  -- Security check
  IF NOT private.is_platform_superadmin() THEN
    RAISE EXCEPTION 'Access denied. Superadmin privileges required.';
  END IF;

  -- Count totals
  SELECT COUNT(*)::INTEGER INTO tot_users FROM public.profiles;
  SELECT COUNT(*)::INTEGER INTO tot_clubs FROM public.clubs;
  SELECT COUNT(*)::INTEGER INTO tot_matches FROM public.matches;
  SELECT COUNT(*)::INTEGER INTO tot_events FROM public.events;
  SELECT COUNT(*)::INTEGER INTO tot_rsvps FROM public.event_rsvps;
  SELECT COUNT(*)::INTEGER INTO tot_crashes FROM public.crash_reports;
  SELECT COUNT(*)::INTEGER INTO tot_feedback FROM public.user_feedback;

  -- Sports distribution (matches per sport)
  SELECT COALESCE(jsonb_object_agg(sport, cnt), '{}'::jsonb)
  INTO sports_dist
  FROM (
    SELECT sport, COUNT(*)::INTEGER AS cnt
    FROM public.matches
    GROUP BY sport
  ) s;

  -- 30-day registration trend (filled with 0s)
  SELECT COALESCE(jsonb_agg(json_build_object('date', d.day::date, 'count', COALESCE(t.cnt, 0))), '[]'::jsonb)
  INTO reg_trend
  FROM (
    SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day'::interval)::date AS day
  ) d
  LEFT JOIN (
    SELECT created_at::date AS day, COUNT(*)::INTEGER AS cnt
    FROM public.profiles
    WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
    GROUP BY day
  ) t ON t.day = d.day;

  -- 30-day match trend (filled with 0s)
  SELECT COALESCE(jsonb_agg(json_build_object('date', d.day::date, 'count', COALESCE(t.cnt, 0))), '[]'::jsonb)
  INTO match_trend
  FROM (
    SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day'::interval)::date AS day
  ) d
  LEFT JOIN (
    SELECT match_date AS day, COUNT(*)::INTEGER AS cnt
    FROM public.matches
    WHERE match_date >= CURRENT_DATE - INTERVAL '29 days'
    GROUP BY day
  ) t ON t.day = d.day;

  -- 30-day crashes trend (filled with 0s)
  SELECT COALESCE(jsonb_agg(json_build_object('date', d.day::date, 'count', COALESCE(t.cnt, 0))), '[]'::jsonb)
  INTO crash_trend
  FROM (
    SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day'::interval)::date AS day
  ) d
  LEFT JOIN (
    SELECT created_at::date AS day, COUNT(*)::INTEGER AS cnt
    FROM public.crash_reports
    WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
    GROUP BY day
  ) t ON t.day = d.day;

  result := json_build_object(
    'total_users', tot_users,
    'total_clubs', tot_clubs,
    'total_matches', tot_matches,
    'total_events', tot_events,
    'total_rsvps', tot_rsvps,
    'total_crashes', tot_crashes,
    'total_feedback', tot_feedback,
    'sports_distribution', sports_dist,
    'user_registration_trend', reg_trend,
    'matches_trend', match_trend,
    'crash_trend', crash_trend
  )::jsonb;

  RETURN result;
END;
$$;

-- RPC: Get Users List with Stats
CREATE OR REPLACE FUNCTION public.get_superadmin_users_list()
RETURNS TABLE (
  id UUID,
  name TEXT,
  display_name TEXT,
  email TEXT,
  role TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  clubs_count INTEGER,
  matches_count INTEGER,
  win_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check
  IF NOT private.is_platform_superadmin() THEN
    RAISE EXCEPTION 'Access denied. Superadmin privileges required.';
  END IF;

  RETURN QUERY
  WITH match_scores AS (
    SELECT
      m.id AS match_id,
      SUM(CASE WHEN ss.team1_score > ss.team2_score THEN 1 ELSE 0 END) AS team1_sets,
      SUM(CASE WHEN ss.team2_score > ss.team1_score THEN 1 ELSE 0 END) AS team2_sets
    FROM public.matches m
    JOIN public.score_sets ss ON ss.match_id = m.id
    GROUP BY m.id
  ),
  decided_matches AS (
    SELECT
      match_id,
      CASE
        WHEN team1_sets > team2_sets THEN 1
        WHEN team2_sets > team1_sets THEN 2
        ELSE NULL
      END AS winning_team
    FROM match_scores
  ),
  user_match_stats AS (
    SELECT
      mp.user_id,
      COUNT(dm.match_id)::INTEGER AS total_games,
      SUM(CASE WHEN mp.team = dm.winning_team THEN 1 ELSE 0 END)::INTEGER AS total_wins
    FROM decided_matches dm
    JOIN public.match_participants mp ON mp.match_id = dm.match_id
    WHERE mp.user_id IS NOT NULL AND mp.is_guest = FALSE
    GROUP BY mp.user_id
  ),
  user_clubs_stats AS (
    SELECT
      m.user_id,
      COUNT(m.id)::INTEGER AS total_clubs
    FROM public.memberships m
    WHERE m.status = 'active'
    GROUP BY m.user_id
  )
  SELECT
    p.id,
    p.name,
    COALESCE(p.display_name, p.name) AS display_name,
    p.email,
    p.role,
    p.avatar_url,
    p.created_at,
    COALESCE(ucs.total_clubs, 0) AS clubs_count,
    COALESCE(ums.total_games, 0) AS matches_count,
    CASE 
      WHEN COALESCE(ums.total_games, 0) > 0 
      THEN ROUND(COALESCE(ums.total_wins, 0)::NUMERIC / ums.total_games * 100, 1) 
      ELSE 0::NUMERIC 
    END AS win_rate
  FROM public.profiles p
  LEFT JOIN user_match_stats ums ON ums.user_id = p.id
  LEFT JOIN user_clubs_stats ucs ON ucs.user_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

-- RPC: Get Clubs List with Stats
CREATE OR REPLACE FUNCTION public.get_superadmin_clubs_list()
RETURNS TABLE (
  id UUID,
  name TEXT,
  sport_focus TEXT[],
  location TEXT,
  city TEXT,
  created_at TIMESTAMPTZ,
  owner_name TEXT,
  owner_email TEXT,
  members_count INTEGER,
  matches_count INTEGER,
  events_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check
  IF NOT private.is_platform_superadmin() THEN
    RAISE EXCEPTION 'Access denied. Superadmin privileges required.';
  END IF;

  RETURN QUERY
  WITH member_counts AS (
    SELECT club_id, COUNT(*)::INTEGER AS cnt
    FROM public.memberships
    WHERE status = 'active'
    GROUP BY club_id
  ),
  match_counts AS (
    SELECT club_id, COUNT(*)::INTEGER AS cnt
    FROM public.matches
    GROUP BY club_id
  ),
  event_counts AS (
    SELECT club_id, COUNT(*)::INTEGER AS cnt
    FROM public.events
    GROUP BY club_id
  )
  SELECT
    c.id,
    c.name,
    c.sport_focus,
    c.location,
    c.city,
    c.created_at,
    COALESCE(o.display_name, o.name) AS owner_name,
    o.email AS owner_email,
    COALESCE(mc.cnt, 0) AS members_count,
    COALESCE(mtc.cnt, 0) AS matches_count,
    COALESCE(ec.cnt, 0) AS events_count
  FROM public.clubs c
  LEFT JOIN public.profiles o ON o.id = c.owner_id
  LEFT JOIN member_counts mc ON mc.club_id = c.id
  LEFT JOIN match_counts mtc ON mtc.club_id = c.id
  LEFT JOIN event_counts ec ON ec.club_id = c.id
  ORDER BY c.created_at DESC;
END;
$$;

-- RPC: Update Platform User Role
CREATE OR REPLACE FUNCTION public.superadmin_update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_email TEXT;
BEGIN
  -- Security check
  IF NOT private.is_platform_superadmin() THEN
    RAISE EXCEPTION 'Access denied. Superadmin privileges required.';
  END IF;

  -- Validate role input
  IF new_role NOT IN ('superadmin', 'member') THEN
    RAISE EXCEPTION 'Invalid role. Must be superadmin or member.';
  END IF;

  -- Look up target email
  SELECT email INTO target_email FROM public.profiles WHERE id = target_user_id;

  IF target_email IS NULL THEN
    RAISE EXCEPTION 'User not found.';
  END IF;

  -- Safety check: Prevent demoting primary superadmin
  IF lower(target_email) = 'mohdhusni@gmail.com' AND new_role = 'member' THEN
    RAISE EXCEPTION 'Cannot demote the primary platform superadmin.';
  END IF;

  -- Modify platform_admins table (adds or removes)
  IF new_role = 'superadmin' THEN
    INSERT INTO public.platform_admins (email, role)
    VALUES (target_email, 'superadmin')
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;
  ELSE
    DELETE FROM public.platform_admins
    WHERE lower(email) = lower(target_email);
  END IF;

  -- Explicit sync backup (the triggers handle this, but explicit handles any edge case)
  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;
END;
$$;

-- Grant RPC execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_superadmin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_superadmin_users_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_superadmin_clubs_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.superadmin_update_user_role(UUID, TEXT) TO authenticated;
