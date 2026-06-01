ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Profile photos are publicly viewable'
  ) THEN
    CREATE POLICY "Profile photos are publicly viewable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'profile-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload own profile photo'
  ) THEN
    CREATE POLICY "Users can upload own profile photo"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update own profile photo'
  ) THEN
    CREATE POLICY "Users can update own profile photo"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
      )
      WITH CHECK (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete own profile photo'
  ) THEN
    CREATE POLICY "Users can delete own profile photo"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
      );
  END IF;
END $$;
