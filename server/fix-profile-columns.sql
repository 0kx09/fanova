-- Fix profile columns to ensure all required columns exist
-- This fixes the 406 error when fetching user profile

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
  ELSE
    -- Update existing credits to have default if null
    UPDATE public.profiles SET credits = 50 WHERE credits IS NULL;
  END IF;
END $$;

-- Update existing profiles to have default values for new columns
UPDATE public.profiles 
SET 
  subscription_plan = COALESCE(subscription_plan, 'base'),
  credits = COALESCE(credits, 50),
  monthly_credits_allocated = COALESCE(monthly_credits_allocated, 0)
WHERE subscription_plan IS NULL OR credits IS NULL OR monthly_credits_allocated IS NULL;
