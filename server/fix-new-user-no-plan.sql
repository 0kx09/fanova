-- Update new user registration to start with no plan and zero credits
-- Users can create the first 3 images for free

-- Step 1: Ensure subscription_plan column allows NULL
DO $$
BEGIN
  -- Check if subscription_plan column exists and allows NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'subscription_plan'
  ) THEN
    -- Allow NULL values
    ALTER TABLE public.profiles ALTER COLUMN subscription_plan DROP NOT NULL;
    -- Remove default if it exists
    ALTER TABLE public.profiles ALTER COLUMN subscription_plan DROP DEFAULT;
  END IF;
  
  -- Ensure credits column exists and defaults to 0
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'credits'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 0;
  ELSE
    -- Update default to 0
    ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 0;
  END IF;
END $$;

-- Step 2: Update handle_new_user function to set no plan and zero credits
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert profile with no plan and zero credits
  INSERT INTO public.profiles (id, email, credits, subscription_plan)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''), 
    0,  -- Zero credits
    NULL  -- No plan
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

-- Step 3: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Update existing users who have 'base' plan but no subscription to NULL
-- This is for users who registered before this change
UPDATE public.profiles
SET subscription_plan = NULL
WHERE subscription_plan = 'base' 
  AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')
  AND (subscription_start_date IS NULL);
