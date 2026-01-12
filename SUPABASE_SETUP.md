# Supabase Setup Guide for Fanova

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in the details:
   - **Name**: Fanova
   - **Database Password**: (create a strong password and save it)
   - **Region**: Choose closest to you
5. Click "Create new project" and wait for it to initialize (~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, click on the "Settings" icon (⚙️) in the sidebar
2. Go to "API" section
3. You'll see two keys:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (different long string)

⚠️ **IMPORTANT**: Never commit the `service_role` key to Git - it has admin access!

## Step 3: Set Up Database Schema

1. In Supabase dashboard, go to "SQL Editor" in the sidebar
2. Click "New query"
3. Copy the entire contents of `server/supabase-schema.sql`
4. Paste into the SQL Editor
5. Click "Run" or press Ctrl+Enter
6. You should see "Success. No rows returned"

This creates:
- `profiles` table (user profiles)
- `models` table (AI model data)
- `generated_images` table (all generated images)
- `reference_images` table (uploaded reference images)
- Row Level Security (RLS) policies for data privacy
- Automatic profile creation trigger

## Step 4: Set Up Storage for Images

You need to create **two storage buckets**:

### Bucket 1: `model-images` (for model reference images)

1. Go to "Storage" in the sidebar
2. Click "Create a new bucket"
3. Create bucket named: `model-images`
4. Make it **public** (so images can be displayed)
5. Click "Create bucket"

### Bucket 2: `images` (for NSFW temporary uploads and general images)

1. Go to "Storage" in the sidebar
2. Click "Create a new bucket"
3. Create bucket named: `images`
4. Make it **public** (so images can be displayed)
5. Click "Create bucket"

### Configure Storage Policies

**Option A: Use SQL Editor (Recommended)**

1. Go to "SQL Editor" in Supabase dashboard
2. Click "New query"
3. Copy and paste the contents of `server/supabase-storage-setup.sql`
4. Click "Run" or press Ctrl+Enter

**Option B: Manual Setup via Dashboard**

For `model-images` bucket:
1. Click on the `model-images` bucket
2. Go to "Policies" tab
3. Add these policies:

**Policy 1: Allow authenticated uploads**
```sql
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'model-images');
```

**Policy 2: Public read access**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'model-images');
```

**Policy 3: Users can delete own images**
```sql
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'model-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

For `images` bucket:
1. Click on the `images` bucket
2. Go to "Policies" tab
3. Add these policies (same as above but with `bucket_id = 'images'`):

**Policy 1: Allow authenticated uploads**
```sql
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');
```

**Policy 2: Public read access**
```sql
DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;
CREATE POLICY "Public read access for images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');
```

**Policy 3: Users can update own images**
```sql
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images');
```

**Policy 4: Users can delete own images**
```sql
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');
```

## Step 5: Configure Environment Variables

### Frontend (.env in root `/Fanova` folder)

Create or update `.env` file:

```env
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_public_key_here
```

### Backend (.env in `/Fanova/server` folder)

Update `.env` file:

```env
PORT=5000

# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Google Gemini API (existing)
GOOGLE_API_KEY=your_google_api_key_here
```

## Step 6: Enable Email Authentication

1. Go to "Authentication" → "Providers" in Supabase
2. Make sure "Email" is enabled (it should be by default)
3. Optional: Configure email templates under "Email Templates"

## Step 7: Test the Setup

1. Start your backend server:
   ```bash
   cd server
   npm run dev
   ```

2. Start your frontend:
   ```bash
   cd ..
   npm start
   ```

3. Try to register a new account
4. Check Supabase dashboard → "Authentication" → "Users" to see if the user was created
5. Check "Table Editor" → "profiles" to see if the profile was created automatically

## Verification Checklist

- [ ] Supabase project created
- [ ] API keys copied to .env files (both frontend and backend)
- [ ] Database schema executed successfully
- [ ] `model-images` storage bucket created and configured
- [ ] `images` storage bucket created and configured
- [ ] Storage policies added
- [ ] Email auth enabled
- [ ] Environment variables set correctly
- [ ] Can register a new user
- [ ] User appears in Supabase Auth dashboard
- [ ] Profile automatically created in profiles table

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Check that your .env files have the correct variable names
- Restart both frontend and backend servers after adding env variables

### Error: "Invalid API key"
- Make sure you're using the `anon` key for frontend
- Make sure you're using the `service_role` key for backend
- No extra spaces or quotes in the .env file

### Error: "Row Level Security policy violation"
- Make sure all the RLS policies were created from the SQL schema
- Check that the user is authenticated before accessing data

### Images not showing
- Make sure the `model-images` bucket is set to public
- Check that storage policies were created correctly
- Verify the image URLs are being saved correctly in the database

## Next Steps

Once setup is complete, Fanova will:
- ✅ Store user accounts in Supabase Auth
- ✅ Store all model data in Supabase database
- ✅ Store generated images in Supabase Storage
- ✅ Automatically sync data across all user devices
- ✅ Provide secure, user-specific data access through RLS
