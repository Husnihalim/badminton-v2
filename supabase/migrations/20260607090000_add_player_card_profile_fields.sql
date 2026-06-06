-- Add structured player-card identity fields to profiles.
-- These fields are user-managed and feed the personal player card.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS gear JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_social_links_object CHECK (jsonb_typeof(social_links) = 'object') NOT VALID,
  ADD CONSTRAINT profiles_gear_object CHECK (jsonb_typeof(gear) = 'object') NOT VALID;
