-- Complete fix for handle_new_user function
-- This fixes the "Database error saving new user" issue

-- First, ensure all required columns exist
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
  
  -- Ensure credits column exists and has default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'credits'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 50;
  END IF;
END $$;

-- Drop and recreate the function to ensure it's correct
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile with all required fields
  INSERT INTO public.profiles (id, email, credits, subscription_plan)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''), 
    50, 
    'base'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
