-- Migration: Week 0 Security Gating and Database Indexing
-- Created: 2026-06-08

-- ----------------------------------------------------
-- 1. Restrict Telemetry (Logs & Crashes) to Authenticated Users
-- ----------------------------------------------------

-- Platform Logs Policies Gating
DROP POLICY IF EXISTS "Anyone can insert platform logs" ON public.platform_logs;
CREATE POLICY "Authenticated users can insert platform logs"
  ON public.platform_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Crash Reports Policies Gating
DROP POLICY IF EXISTS "Anyone can insert crash reports" ON public.crash_reports;
CREATE POLICY "Authenticated users can insert crash reports"
  ON public.crash_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);


-- ----------------------------------------------------
-- 2. Add Trigger-Based Telemetry Rate Limiting
-- ----------------------------------------------------

-- Trigger function for platform_logs rate limiting
CREATE OR REPLACE FUNCTION public.check_platform_logs_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
  v_user_id UUID;
BEGIN
  -- Resolve auth.uid()
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied. Must be authenticated to insert platform logs.';
  END IF;

  -- Count inserts by this user in the last 1 minute
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.platform_logs
  WHERE user_id = v_user_id
    AND created_at > NOW() - INTERVAL '1 minute';
    
  IF v_count >= 15 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Maximum 15 logs per minute allowed.';
  END IF;
  
  -- Force the user_id to be the authenticated user's ID
  NEW.user_id := v_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on platform_logs
DROP TRIGGER IF EXISTS tr_platform_logs_rate_limit ON public.platform_logs;
CREATE TRIGGER tr_platform_logs_rate_limit
  BEFORE INSERT ON public.platform_logs
  FOR EACH ROW EXECUTE FUNCTION public.check_platform_logs_rate_limit();


-- Trigger function for crash_reports rate limiting
CREATE OR REPLACE FUNCTION public.check_crash_reports_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
  v_user_id UUID;
BEGIN
  -- Resolve auth.uid()
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied. Must be authenticated to insert crash reports.';
  END IF;

  -- Count inserts by this user in the last 1 minute
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.crash_reports
  WHERE user_id = v_user_id
    AND created_at > NOW() - INTERVAL '1 minute';
    
  IF v_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Maximum 10 crash reports per minute allowed.';
  END IF;
  
  -- Force the user_id to be the authenticated user's ID
  NEW.user_id := v_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on crash_reports
DROP TRIGGER IF EXISTS tr_crash_reports_rate_limit ON public.crash_reports;
CREATE TRIGGER tr_crash_reports_rate_limit
  BEFORE INSERT ON public.crash_reports
  FOR EACH ROW EXECUTE FUNCTION public.check_crash_reports_rate_limit();


-- ----------------------------------------------------
-- 3. Add Core Performance Database Indexes
-- ----------------------------------------------------

-- Index for match participants user lookup
CREATE INDEX IF NOT EXISTS idx_match_participants_user_id 
  ON public.match_participants(user_id);

-- Index for event RSVPs user lookup
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id 
  ON public.event_rsvps(user_id);

-- Indexes for Elo rating history lookup
CREATE INDEX IF NOT EXISTS idx_elo_history_membership_id 
  ON public.elo_history(membership_id);

CREATE INDEX IF NOT EXISTS idx_elo_history_match_id 
  ON public.elo_history(match_id);
