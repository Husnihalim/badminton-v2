-- Add logo, banner, color, and announcement columns to clubs table
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_preset TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT 'emerald',
  ADD COLUMN IF NOT EXISTS announcement TEXT,
  ADD COLUMN IF NOT EXISTS announcement_updated_at TIMESTAMPTZ;

-- Initialize storage buckets for club logos and banners
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('club-logos', 'club-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('club-banners', 'club-banners', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policies for club-logos bucket
DO $$
BEGIN
  -- Read Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Club logos are publicly viewable'
  ) THEN
    CREATE POLICY "Club logos are publicly viewable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'club-logos');
  END IF;

  -- Insert Policy (Club Admins only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload club logo'
  ) THEN
    CREATE POLICY "Admins can upload club logo"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'club-logos'
        AND private.is_club_admin(((storage.foldername(name))[1])::uuid)
      );
  END IF;

  -- Update Policy (Club Admins only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update club logo'
  ) THEN
    CREATE POLICY "Admins can update club logo"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'club-logos'
        AND private.is_club_admin(((storage.foldername(name))[1])::uuid)
      )
      WITH CHECK (
        bucket_id = 'club-logos'
        AND private.is_club_admin(((storage.foldername(name))[1])::uuid)
      );
  END IF;

  -- Delete Policy (Club Admins only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete club logo'
  ) THEN
    CREATE POLICY "Admins can delete club logo"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'club-logos'
        AND private.is_club_admin(((storage.foldername(name))[1])::uuid)
      );
  END IF;
END $$;

-- RLS Policies for club-banners bucket
DO $$
BEGIN
  -- Read Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Club banners are publicly viewable'
  ) THEN
    CREATE POLICY "Club banners are publicly viewable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'club-banners');
  END IF;

  -- Insert Policy (Club Admins only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload club banner'
  ) THEN
    CREATE POLICY "Admins can upload club banner"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'club-banners'
        AND private.is_club_admin(((storage.foldername(name))[1])::uuid)
      );
  END IF;

  -- Update Policy (Club Admins only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update club banner'
  ) THEN
    CREATE POLICY "Admins can update club banner"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'club-banners'
        AND private.is_club_admin(((storage.foldername(name))[1])::uuid)
      )
      WITH CHECK (
        bucket_id = 'club-banners'
        AND private.is_club_admin(((storage.foldername(name))[1])::uuid)
      );
  END IF;

  -- Delete Policy (Club Admins only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete club banner'
  ) THEN
    CREATE POLICY "Admins can delete club banner"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'club-banners'
        AND private.is_club_admin(((storage.foldername(name))[1])::uuid)
      );
  END IF;
END $$;

-- Allow active club members to insert into club_messages so automatic match notifications can be posted by any active member recording a match
DROP POLICY IF EXISTS "Club members can create messages" ON club_messages;
DROP POLICY IF EXISTS "Club admins can create messages" ON club_messages;
CREATE POLICY "Club members can create messages"
  ON club_messages FOR INSERT
  TO authenticated
  WITH CHECK (private.is_active_club_member(club_id));

