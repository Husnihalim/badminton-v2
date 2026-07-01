-- Migration: Homepage marketplace layer — listings table + get_homepage_marketplace RPC
-- Created: 2026-07-01 (Phase 4 of proposal-homepage-redesign.md)
-- Scope: new marketplace_listings table (the existing ClubMarketplace UI is mock-only).
-- Mirrors the MarketplaceListing interface in src/features/clubs/components/ClubMarketplace.tsx
-- so the future DB-backed club marketplace swaps in cleanly.

-- ============================================
-- 1. marketplace_listings table
-- ============================================
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('gear','apparel','court','coaching','wanted')),
  condition_label TEXT NOT NULL CHECK (condition_label IN ('New','Like new','Good','Well used','Wanted')),
  price INTEGER,                                  -- NULL = "Offer" / wanted
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','wanted','sold')),
  image_url TEXT,
  image_class TEXT,                               -- CSS gradient class fallback (matches mock)
  trust_signals TEXT[] DEFAULT '{}',
  -- Location (for distance-ranked homepage rail)
  home_lat DOUBLE PRECISION,
  home_lng DOUBLE PRECISION,
  home_point GEOGRAPHY(POINT, 4326),
  location_label TEXT,                            -- human-readable ("Subang Jaya")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Public can browse available listings (homepage is public).
CREATE POLICY "Anyone can browse available listings"
  ON marketplace_listings FOR SELECT
  USING (status IN ('available','reserved','wanted'));

-- Authenticated members of the listing's club can create/update/delete their own.
CREATE POLICY "Members can create listings in their club"
  ON marketplace_listings FOR INSERT
  WITH CHECK (
    seller_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.club_id = marketplace_listings.club_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "Sellers can update their own listings"
  ON marketplace_listings FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can delete their own listings"
  ON marketplace_listings FOR DELETE
  USING (seller_id = auth.uid());

-- ============================================
-- 2. Sync trigger for home_point (mirrors clubs)
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_listing_home_point()
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

DROP TRIGGER IF EXISTS listings_sync_home_point ON marketplace_listings;
CREATE TRIGGER listings_sync_home_point
  BEFORE INSERT OR UPDATE OF home_lat, home_lng ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.sync_listing_home_point();

CREATE INDEX IF NOT EXISTS listings_home_point_idx
  ON marketplace_listings USING GIST (home_point);

CREATE INDEX IF NOT EXISTS listings_status_created_idx
  ON marketplace_listings (status, created_at DESC);

-- ============================================
-- 3. Homepage RPC — 3 "deals of the week near you"
--    Returns rounded distance_km only; never exact coords.
--    Falls back to location-independent most-recent 3 when no coords given.
-- ============================================
CREATE OR REPLACE FUNCTION public.get_homepage_marketplace(
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_km DOUBLE PRECISION DEFAULT 100,
  p_limit INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_near JSONB;
  v_recent JSONB;
  v_has_coords BOOLEAN := (p_lat IS NOT NULL AND p_lng IS NOT NULL);
BEGIN
  IF v_has_coords THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', l.id,
      'title', l.title,
      'description', l.description,
      'category', l.category,
      'condition_label', l.condition_label,
      'price', l.price,
      'status', l.status,
      'image_url', l.image_url,
      'image_class', l.image_class,
      'trust_signals', l.trust_signals,
      'location_label', COALESCE(l.location_label, c.city),
      'club_id', l.club_id,
      'club_name', c.name,
      'club_accent', c.accent_color,
      'distance_km', ROUND((ST_Distance(l.home_point, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000.0)::numeric, 1)
    ) ORDER BY distance_km, l.created_at DESC), '[]'::jsonb)
    INTO v_near
    FROM marketplace_listings l
    JOIN clubs c ON c.id = l.club_id
    WHERE l.home_point IS NOT NULL
      AND ST_DWithin(l.home_point, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
      AND l.status IN ('available','reserved','wanted')
    LIMIT p_limit;
  ELSE
    v_near := '[]'::jsonb;
  END IF;

  -- Always: most-recent location-independent deals so the rail is never empty.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', l.id,
      'title', l.title,
      'description', l.description,
      'category', l.category,
      'condition_label', l.condition_label,
      'price', l.price,
      'status', l.status,
      'image_url', l.image_url,
      'image_class', l.image_class,
      'trust_signals', l.trust_signals,
      'location_label', COALESCE(l.location_label, c.city),
      'club_id', l.club_id,
      'club_name', c.name,
      'club_accent', c.accent_color,
      'distance_km', NULL
    ) ORDER BY l.created_at DESC), '[]'::jsonb)
  INTO v_recent
  FROM marketplace_listings l
  JOIN clubs c ON c.id = l.club_id
  WHERE l.status IN ('available','reserved','wanted')
  LIMIT p_limit;

  RETURN jsonb_build_object(
    'has_coords', v_has_coords,
    'radius_km', p_radius_km,
    'deals_near', v_near,
    'deals_recent', v_recent
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_homepage_marketplace(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated, anon;