-- Supabase Storage Bucket Setup for Fanova
-- Run this in Supabase SQL Editor to create the storage bucket and policies

-- Create the 'images' storage bucket (if it doesn't exist)
-- Note: Buckets must be created via the Supabase Dashboard or Storage API
-- This SQL will help you set up the policies after creating the bucket manually

-- Step 1: Create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage in the sidebar
-- 2. Click "Create a new bucket"
-- 3. Name: "images"
-- 4. Make it PUBLIC (toggle on)
-- 5. Click "Create bucket"

-- Step 2: Run the policies below after creating the bucket
-- This script will drop existing policies if they exist, then create new ones

-- Policy 1: Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Policy 2: Public read access (so images can be displayed)
DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;
CREATE POLICY "Public read access for images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Policy 3: Authenticated users can update their own images
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images');

-- Policy 4: Authenticated users can delete their own images
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');

-- Note: The folder structure will be:
-- images/nsfw-temp/ - Temporary NSFW image uploads
-- images/model-images/ - Model reference images (if using model-images bucket)
-- images/generated/ - Generated images (if needed)
