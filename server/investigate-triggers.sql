-- ============================================
-- INVESTIGATION QUERIES
-- Run these in Supabase SQL Editor to check current state
-- ============================================

-- 1. Check for triggers on profiles table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
ORDER BY trigger_name;

-- 2. Check column defaults
SELECT 
    column_name, 
    column_default,
    data_type
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('credits', 'subscription_plan', 'monthly_credits_allocated')
ORDER BY column_name;

-- 3. Check current trigger function definition
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'handle_new_user';

-- 4. Count users with incorrect values
SELECT 
  COUNT(*) as users_with_base_plan_and_high_credits
FROM profiles
WHERE subscription_plan = 'base' 
  AND (credits >= 100 OR monthly_credits_allocated >= 100);

-- 5. Sample of users with base plan
SELECT 
  id, 
  email, 
  credits, 
  subscription_plan, 
  monthly_credits_allocated,
  created_at
FROM profiles
WHERE subscription_plan = 'base'
ORDER BY created_at DESC
LIMIT 10;
