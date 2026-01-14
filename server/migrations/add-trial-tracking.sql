-- Add column to track if user has used their free trial
-- This prevents users from getting the free trial multiple times

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN profiles.has_used_trial IS 'Tracks whether the user has ever used a free trial subscription';
