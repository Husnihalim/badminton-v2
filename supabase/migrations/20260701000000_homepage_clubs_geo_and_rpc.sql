-- Migration: Homepage geo layer for clubs — PostGIS, featured flag, and get_homepage_clubs RPC
-- Created: 2026-07-01
-- Phase 2 of the ESPN-style homepage redesign (proposal-homepage-redesign.md).
-- Scope: clubs only. Marketplace (P4) needs its own table first; profiles (P3) follow.

-- ============================================
-- 1. Enable PostGIS (idempotent)
-- ============================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 2. Geo + featuring columns on clubs
-- ============================================
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS home_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS home_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS home_point GEOGRAPHY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS home_postcode TEXT,
  ADD COLUMN IF NOT EXISTS featured_public BOOLEAN NOT NULL DEFAULT false;

-- Keep home_point in sync with (home_lat, home_lng) when admins edit addresses.
CREATE OR REPLACE FUNCTION public.sync_club_home_point()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.home_lat IS NOT NULL AND NEW.home_lng IS NOT NULL THEN
    NEW.home_point := ST_SetSRID(ST_MakePoint(NEW.home_lng, NEW.home_lat), 4326)::geography;
  ELSE
    NEW.home_point := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clubs_sync_home_point ON clubs;
CREATE TRIGGER clubs_sync_home_point
  BEFORE INSERT OR UPDATE OF home_lat, home_lng ON clubs
  FOR EACH ROW EXECUTE FUNCTION public.sync_club_home_point();

-- GiST index for ST_DWithin radius searches.
CREATE INDEX IF NOT EXISTS clubs_home_point_idx
  ON clubs USING GIST (home_point);

-- Partial index to find featured clubs cheaply.
CREATE INDEX IF NOT EXISTS clubs_featured_public_idx
  ON clubs (featured_public)
  WHERE featured_public = true;

-- ============================================
-- 3. Grant execute on the trigger helper (nothing extra needed; SECURITY DEFINER)
-- ============================================
-- The sync trigger runs as the definer, so ordinary UPDATEs still work.

-- ============================================
-- 4. Homepage RPC — returns clubs within radius + featured clubs (no coords needed)
--    p_lat / p_lng / p_radius_km may all be NULL → returns only featured set.
--    Never returns exact lat/lng; only distance_km (rounded to 1dp) + city / postcode chip.
-- ============================================
CREATE OR REPLACE FUNCTION public.get_homepage_clubs(
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_km DOUBLE PRECISION DEFAULT 25,
  p_limit_near INTEGER DEFAULT 12,
  p_limit_featured INTEGER DEFAULT 8
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_near JSONB;
  v_featured JSONB;
  v_has_coords BOOLEAN := (p_lat IS NOT NULL AND p_lng IS NOT NULL);
BEGIN
  -- Nearby clubs (only those with a set home point)
  IF v_has_coords THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'city', c.city,
      'home_postcode', c.home_postcode,
      'sport_focus', c.sport_focus,
      'accent_color', c.accent_color,
      'logo_url', c.logo_url,
      'banner_preset', c.banner_preset,
      'open_join', c.open_join,
      'approval_required', c.approval_required,
      'is_private', c.is_private,
      'featured_public', c.featured_public,
      'membersCount', COALESCE((SELECT COUNT(*) FROM memberships m WHERE m.club_id = c.id AND m.status = 'active'), 0),
      'distance_km', ROUND((ST_Distance(c.home_point, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000.0)::numeric, 1)
    ) ORDER BY distance_km), '[]'::jsonb)
    INTO v_near
    FROM clubs c
    WHERE c.home_point IS NOT NULL
      AND ST_DWithin(c.home_point, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
      AND COALESCE(c.is_private, false) = false
    LIMIT p_limit_near;
  ELSE
    v_near := '[]'::jsonb;
  END IF;

  -- Featured clubs (location-independent fallback so the wall is never empty)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'city', c.city,
      'home_postcode', c.home_postcode,
      'sport_focus', c.sport_focus,
      'accent_color', c.accent_color,
      'logo_url', c.logo_url,
      'banner_preset', c.banner_preset,
      'open_join', c.open_join,
      'approval_required', c.approval_required,
      'is_private', c.is_private,
      'featured_public', c.featured_public,
      'membersCount', COALESCE((SELECT COUNT(*) FROM memberships m WHERE m.club_id = c.id AND m.status = 'active'), 0),
      'distance_km', NULL
    ) ORDER BY c.updated_at DESC NULLS LAST), '[]'::jsonb)
  INTO v_featured
  FROM clubs c
  WHERE c.featured_public = true
    AND COALESCE(c.is_private, false) = false
  LIMIT p_limit_featured;

  RETURN jsonb_build_object(
    'has_coords', v_has_coords,
    'radius_km', p_radius_km,
    'clubs_near', v_near,
    'featured_clubs', v_featured
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_homepage_clubs(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) TO authenticated, anon;