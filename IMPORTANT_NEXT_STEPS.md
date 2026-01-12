# ⚠️ IMPORTANT: Run This SQL in Supabase First!

Before testing the updated app, you MUST run the database schema in your Supabase project.

## Step 1: Go to Supabase SQL Editor

1. Open your Supabase project: https://wfsjnqdmfenpnzbhnynl.supabase.co
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

## Step 2: Copy and Paste the SQL

Open the file `server/supabase-schema.sql` and copy ALL of its contents.

Paste it into the SQL Editor.

## Step 3: Run the Query

Click "Run" or press Ctrl+Enter.

You should see "Success. No rows returned" or similar.

## Step 4: Verify Tables Were Created

1. Go to "Table Editor" in the left sidebar
2. You should now see these tables:
   - profiles
   - models
   - generated_images
   - reference_images

## Step 5: Create Storage Bucket

1. Go to "Storage" in the left sidebar
2. Click "Create a new bucket"
3. Name it: `model-images`
4. Make it **Public**
5. Click "Create bucket"

## Step 6: Test the App

Now you can test! The flow will be:

1. Register → Creates user in Supabase Auth + creates profile
2. Model Info → Saves to `models` table
3. Attributes → Updates `models.attributes`
4. Facial Features → Updates `models.facial_features`
5. Generate → Saves images to `generated_images` table
6. Select Image → Marks image as selected in database
7. Dashboard → Fetches real data from Supabase

## Current Status

✅ Registration works (creates auth user + profile)
✅ Frontend updated to use Supabase
✅ ModelInfo/ModelAttributes/FacialFeatures save to Supabase
⏳ Need to update GenerateResults to save images
⏳ Need to update Dashboard to fetch from Supabase
⏳ Need to fix double generation bug

The backend API still uses the old in-memory storage. Since we're using Supabase directly from the frontend now, we can bypass the backend API for model CRUD operations (Create, Read, Update, Delete).

The backend is still needed for:
- Image generation (calling Google Gemini API)
- Prompt generation

Next, I'll update GenerateResults and Dashboard.
