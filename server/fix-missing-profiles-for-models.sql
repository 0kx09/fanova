-- Fix missing profiles that are causing foreign key constraint violations
-- This ensures all users in auth.users have corresponding profiles

-- Create profiles for any users that don't have one
INSERT INTO public.profiles (id, email, credits, subscription_plan)
SELECT 
  u.id,
  COALESCE(u.email, ''),
  50,
  'base'
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the fix
SELECT 
  COUNT(*) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  COUNT(*) - (SELECT COUNT(*) FROM public.profiles) as missing_profiles
FROM auth.users;
