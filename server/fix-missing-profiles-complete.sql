-- Complete fix for missing profiles issue
-- Run this in Supabase SQL Editor

-- Step 1: Ensure profiles table has all required columns
DO $$
BEGIN
  -- Add credits column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'credits'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 50;
  END IF;

  -- Add subscription_plan column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_plan TEXT DEFAULT 'base';
  END IF;

  -- Add monthly_credits_allocated column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'monthly_credits_allocated'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN monthly_credits_allocated INTEGER DEFAULT 0;
  END IF;

  -- Add subscription date columns if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'subscription_start_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_start_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'subscription_renewal_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_renewal_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'last_credit_allocation_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_credit_allocation_date TIMESTAMPTZ;
  END IF;
END $$;

-- Step 2: Create profiles for ALL existing users who don't have one
INSERT INTO public.profiles (id, email, credits, subscription_plan, monthly_credits_allocated)
SELECT
  u.id,
  u.email,
  50,
  'base',
  0
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 3: Update the handle_new_user function to auto-create profiles
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, subscription_plan, monthly_credits_allocated)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    50,
    'base',
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 4: Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Verify - this will show all users and their profile status
SELECT
  u.id,
  u.email,
  p.id IS NOT NULL as has_profile,
  p.credits,
  p.subscription_plan
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
