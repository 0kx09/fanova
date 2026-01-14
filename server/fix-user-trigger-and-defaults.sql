-- ============================================
-- FIX: User Profile Defaults and Trigger
-- ============================================
-- This migration fixes the issue where new users are created with:
-- - 100 credits (should be 0)
-- - 'base' plan (should be NULL)
-- - monthly_credits_allocated >= 100 (should be 0)
--
-- STEPS:
-- 1. Fix the trigger function
-- 2. Update column defaults
-- 3. Clean up existing incorrect data
-- ============================================

-- ============================================
-- STEP 1: INVESTIGATE - Check current triggers
-- ============================================
-- Run this first to see what triggers exist:
/*
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
ORDER BY trigger_name;
*/

-- ============================================
-- STEP 2: INVESTIGATE - Check current defaults
-- ============================================
-- Run this to see current column defaults:
/*
SELECT 
    column_name, 
    column_default,
    data_type
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('credits', 'subscription_plan', 'monthly_credits_allocated')
ORDER BY column_name;
*/

-- ============================================
-- STEP 3: FIX - Update trigger function
-- ============================================
-- Replace the handle_new_user function with correct defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, subscription_plan, monthly_credits_allocated)
  VALUES (
    NEW.id,
    NEW.email,
    0,     -- Start with 0 credits (not 100)
    NULL,  -- No plan by default (not 'base')
    0      -- No allocated credits (not 100)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: FIX - Update column defaults
-- ============================================
ALTER TABLE profiles 
  ALTER COLUMN credits SET DEFAULT 0;

ALTER TABLE profiles 
  ALTER COLUMN subscription_plan SET DEFAULT NULL;

ALTER TABLE profiles 
  ALTER COLUMN monthly_credits_allocated SET DEFAULT 0;

-- ============================================
-- STEP 5: FIX - Clean up existing incorrect data
-- ============================================
-- Reset users who have incorrect 'base' plan with high credits
UPDATE profiles
SET
  subscription_plan = NULL,
  credits = 0,
  monthly_credits_allocated = 0,
  subscription_start_date = NULL,
  subscription_renewal_date = NULL
WHERE
  subscription_plan = 'base'
  AND (credits >= 100 OR monthly_credits_allocated >= 100);

-- ============================================
-- STEP 6: VERIFY - Check the fix worked
-- ============================================
-- Check remaining users with base plan (should be none or very few)
/*
SELECT id, email, credits, subscription_plan, monthly_credits_allocated
FROM profiles
WHERE subscription_plan = 'base'
LIMIT 10;
*/

-- Check count of users fixed
/*
SELECT 
  COUNT(*) as users_fixed
FROM profiles
WHERE subscription_plan IS NULL 
  AND credits = 0 
  AND monthly_credits_allocated = 0;
*/

-- ============================================
-- VERIFICATION QUERIES (Run separately)
-- ============================================

-- Query 1: Check trigger exists and is correct
-- SELECT 
--   p.proname as function_name,
--   pg_get_functiondef(p.oid) as function_definition
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' 
--   AND p.proname = 'handle_new_user';

-- Query 2: Verify column defaults
-- SELECT 
--   column_name, 
--   column_default,
--   data_type
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' 
--   AND column_name IN ('credits', 'subscription_plan', 'monthly_credits_allocated')
-- ORDER BY column_name;

-- Query 3: Count users with incorrect values (should be 0 after fix)
-- SELECT 
--   COUNT(*) as incorrect_users
-- FROM profiles
-- WHERE subscription_plan = 'base' 
--   AND (credits >= 100 OR monthly_credits_allocated >= 100);
