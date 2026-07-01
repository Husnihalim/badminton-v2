-- Migration: Homepage players layer — profile consent flags + get_homepage_players RPC
-- Created: 2026-07-01 (Phase 3 of proposal-homepage-redesign.md)
-- Scope: profiles only. Implements the minors policy decision:
--   "Feature with club + parental consent" — under-18s appear on the public
--   homepage ONLY when featured_public = true AND guardian_feature_consent = true
--   AND they belong to a featured_public club. Default off for everyone.

-- ============================================
-- 1. Consent & age-band columns on profiles
-- ============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS featured_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS guardian_feature_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guardian_name TEXT;

-- Index opt-in players cheaply (only those 18+ OR minors-with-consent).
CREATE INDEX IF NOT EXISTS profiles_featured_public_idx
  ON profiles (featured_public)
  WHERE featured_public = true;

-- ============================================
-- 2. Helper: is the profile an adult?
-- ============================================
CREATE OR REPLACE FUNCTION public.profile_is_adult(p_dob DATE)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_dob IS NULL OR p_dob <= (NOW() - INTERVAL '18 years')::date;
$$;

-- ============================================
-- 3. Homepage players RPC
--    Returns opted-in athletes (featured_public = true) who pass the minors gate.
--    For under-18s: requires guardian_feature_consent = true AND membership in a
--    club whose featured_public = true. Adults only need featured_public = true.
--    Never returns DOB, email, phone, or exact address.
-- ============================================
CREATE OR REPLACE FUNCTION public.get_homepage_players(
  p_limit INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_players JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'display_name', COALESCE(p.display_name, p.name),
    'avatar_url', p.avatar_url,
    'city', p.city,
    'preferred_sport', p.preferred_sport,
    'singles_elo', p.singles_elo,
    'doubles_elo', p.doubles_elo,
    'singles_games', p.singles_games,
    'doubles_games', p.doubles_games,
    'club_id', mc.club_id,
    'club_name', c.name,
    'club_accent', c.accent_color,
    'is_adult', public.profile_is_adult(p.date_of_birth)
  ) ORDER BY COALESCE(p.doubles_elo, p.singles_elo, 0) DESC NULLS LAST), '[]'::jsonb)
  INTO v_players
  FROM profiles p
  LEFT JOIN LATERAL (
    SELECT m.club_id
    FROM memberships m
    WHERE m.user_id = p.id AND m.status = 'active'
    ORDER BY m.joined_at DESC
    LIMIT 1
  ) mc ON TRUE
  LEFT JOIN clubs c ON c.id = mc.club_id
  WHERE p.featured_public = true
    AND COALESCE(p.is_private, false) = false
    AND (
      -- adults: featured_public alone is enough
      public.profile_is_adult(p.date_of_birth)
      OR (
        -- minors: need guardian consent AND a featured club membership
        p.guardian_feature_consent = true
        AND c.featured_public = true
      )
    )
  LIMIT p_limit;

  RETURN jsonb_build_object(
    'players', v_players
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_homepage_players(INTEGER) TO authenticated, anon;