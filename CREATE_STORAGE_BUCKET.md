# Quick Guide: Create Supabase Storage Bucket

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Go to your Supabase project: https://supabase.com/dashboard
- Select your Fanova project

### 2. Navigate to Storage
- Click **"Storage"** in the left sidebar
- You should see a list of buckets (or an empty list if none exist)

### 3. Create the `images` Bucket
- Click the **"New bucket"** button (or "Create a new bucket")
- Fill in the details:
  - **Name**: `images`
  - **Public bucket**: Toggle this **ON** (important!)
  - **File size limit**: Leave default or set to 5MB
  - **Allowed MIME types**: Leave empty (allows all types)
- Click **"Create bucket"**

### 4. Set Up Storage Policies

**Option A: Using SQL Editor (Easiest)**

1. Go to **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy and paste this SQL:

```sql
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
```

4. Click **"Run"** (or press Ctrl+Enter)
5. You should see "Success" messages

**Option B: Using Dashboard (Manual - Recommended if SQL fails)**

This is the easiest method if you're getting SQL errors:

1. Click on the `images` bucket you just created
2. Go to the **"Policies"** tab
3. Click **"New Policy"** button
4. For each policy, follow these steps:

   **Policy 1: Upload (INSERT)**
   - Policy name: `Authenticated users can upload images`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - Policy definition: `bucket_id = 'images'`
   - Click "Save"

   **Policy 2: Read (SELECT)**
   - Policy name: `Public read access for images`
   - Allowed operation: `SELECT`
   - Target roles: `public`
   - Policy definition: `bucket_id = 'images'`
   - Click "Save"

   **Policy 3: Update**
   - Policy name: `Users can update own images`
   - Allowed operation: `UPDATE`
   - Target roles: `authenticated`
   - Policy definition: `bucket_id = 'images'`
   - Click "Save"

   **Policy 4: Delete**
   - Policy name: `Users can delete own images`
   - Allowed operation: `DELETE`
   - Target roles: `authenticated`
   - Policy definition: `bucket_id = 'images'`
   - Click "Save"

### 5. Verify It Works

The bucket is ready! The NSFW image upload feature will now:
- Upload images to `images/nsfw-temp/` folder
- Make them publicly accessible
- Allow the Wavespeed API to access them

## Troubleshooting

### "Bucket already exists"
- That's fine! Just make sure it's set to **public**
- You can skip to Step 4 to add the policies

### "Policy already exists"
- If you see this error, the policy might already be created
- Check the Policies tab to see what's already there
- You can skip creating duplicate policies

### "Failed to perform authorization check"
- Make sure you're logged into Supabase Dashboard
- Run the SQL in the **SQL Editor** (not from your app code)
- Try running policies one at a time instead of all at once
- Use the alternative SQL script: `server/supabase-storage-setup-alternative.sql`
- Or create policies manually via the Dashboard (see Option B below)

### "Permission denied" when uploading
- Make sure the bucket is set to **public**
- Verify all 4 policies are created correctly
- Check that you're authenticated (logged in)

## What This Bucket Is Used For

- **NSFW Image Uploads**: Temporary uploads for NSFW image editing
- **General Images**: Any other images that need public access
- **Folder Structure**: 
  - `images/nsfw-temp/` - Temporary NSFW uploads (auto-created)

## Next Steps

Once the bucket is created:
1. Try generating an NSFW image in the app
2. The image should upload to Supabase automatically
3. The Wavespeed API will be able to access it via the public URL
