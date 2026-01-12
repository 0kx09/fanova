-- Fix handle_new_user function to include subscription_plan
-- This fixes the "Database error saving new user" issue
-- The function needs to match the columns that exist in the profiles table

-- First, ensure subscription_plan column exists (it should from subscription schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_plan TEXT DEFAULT 'base';
  END IF;
END $$;

-- Update the function to include subscription_plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, subscription_plan)
  VALUES (NEW.id, NEW.email, 50, 'base')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
