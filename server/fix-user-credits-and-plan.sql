-- Fix existing users who have incorrect base plan and credits
-- This script resets users to the correct state: null plan with 0 credits

-- Update all users who have base plan with incorrect pricing
UPDATE profiles
SET
  subscription_plan = NULL,
  credits = 0,
  monthly_credits_allocated = 0,
  subscription_start_date = NULL,
  subscription_renewal_date = NULL
WHERE
  subscription_plan = 'base'
  AND (credits > 10 OR monthly_credits_allocated > 10);

-- Log what was fixed
SELECT
  id,
  email,
  subscription_plan,
  credits,
  monthly_credits_allocated
FROM profiles
WHERE subscription_plan IS NULL AND credits = 0;

-- Display summary
SELECT
  'Fixed users' as action,
  COUNT(*) as count
FROM profiles
WHERE subscription_plan IS NULL AND credits = 0;
