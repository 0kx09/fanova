-- Complete fix for user registration and profile creation
-- Run this to fix all user-related issues

-- Step 1: Ensure all columns exist
DO $$
BEGIN
  -- Ensure subscription_plan column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_plan TEXT DEFAULT 'base';
  END IF;
  
  -- Ensure subscription_start_date column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'subscription_start_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_start_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Ensure subscription_renewal_date column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'subscription_renewal_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_renewal_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Ensure monthly_credits_allocated column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'monthly_credits_allocated'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN monthly_credits_allocated INTEGER DEFAULT 0;
  END IF;

  -- Ensure credits column exists with proper default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'credits'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 50;
  END IF;
END $$;

-- Step 2: Create profiles for any existing users that don't have one
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

-- Step 3: Update existing profiles with default values
UPDATE public.profiles 
SET 
  subscription_plan = COALESCE(subscription_plan, 'base'),
  credits = COALESCE(credits, 50),
  monthly_credits_allocated = COALESCE(monthly_credits_allocated, 0)
WHERE subscription_plan IS NULL OR credits IS NULL OR monthly_credits_allocated IS NULL;

-- Step 4: Fix the handle_new_user function
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

-- Step 5: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
