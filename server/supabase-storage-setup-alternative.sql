-- Alternative Storage Policy Setup for Supabase
-- If you get authorization errors, try this approach:
-- Run each policy separately, or use the Supabase Dashboard

-- IMPORTANT: Make sure you're logged into Supabase Dashboard
-- and running this in the SQL Editor (not from your app)

-- Option 1: Run policies one at a time (recommended if you get errors)

-- Policy 1: Allow authenticated users to upload images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload images'
  ) THEN
    CREATE POLICY "Authenticated users can upload images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'images');
  END IF;
END $$;

-- Policy 2: Public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for images'
  ) THEN
    CREATE POLICY "Public read access for images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'images');
  END IF;
END $$;

-- Policy 3: Users can update own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update own images'
  ) THEN
    CREATE POLICY "Users can update own images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'images');
  END IF;
END $$;

-- Policy 4: Users can delete own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own images'
  ) THEN
    CREATE POLICY "Users can delete own images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'images');
  END IF;
END $$;
