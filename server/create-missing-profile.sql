-- Create profile for existing user if it doesn't exist
-- Replace USER_ID_HERE with the actual user ID from the error: 85d2ef36-abdb-43b0-a81e-aebbc2340774

-- First, let's create a function to safely create profiles for existing users
CREATE OR REPLACE FUNCTION public.create_profile_for_user(user_id UUID, user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, subscription_plan, monthly_credits_allocated)
  VALUES (user_id, user_email, 50, 'base', 0)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    credits = COALESCE(profiles.credits, 50),
    subscription_plan = COALESCE(profiles.subscription_plan, 'base'),
    monthly_credits_allocated = COALESCE(profiles.monthly_credits_allocated, 0);
END;
$$;

-- Create profile for the specific user (replace with actual email if needed)
DO $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = '85d2ef36-abdb-43b0-a81e-aebbc2340774';
  
  IF user_email IS NOT NULL THEN
    PERFORM public.create_profile_for_user('85d2ef36-abdb-43b0-a81e-aebbc2340774', user_email);
    RAISE NOTICE 'Profile created for user: %', user_email;
  ELSE
    RAISE NOTICE 'User not found in auth.users';
  END IF;
END $$;

-- Also create profiles for any other users missing profiles
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
