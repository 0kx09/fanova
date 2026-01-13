-- Referral System Schema
-- Adds referral code and tracking to profiles

-- Add referral_code column to profiles (unique code for each user)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Add referred_by column to track who referred this user
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- Create index on referral_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Create referrals table to track referral history
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL,
  credits_awarded_referrer INTEGER DEFAULT 20,
  credits_awarded_referred INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_id) -- Each user can only be referred once
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);

-- Enable RLS on referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    new_code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) 
        FROM 1 FOR 8
      )
    );
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Update existing profiles to have referral codes if they don't have one
UPDATE public.profiles 
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- Update handle_new_user function to generate referral code and handle referrals
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  referral_code_param TEXT;
  referrer_id_found UUID;
  new_referral_code TEXT;
BEGIN
  -- Get referral code from metadata if provided
  -- Supabase stores custom data in raw_user_meta_data->'data'
  referral_code_param := COALESCE(
    (NEW.raw_user_meta_data->'data'->>'referral_code'),
    NEW.raw_user_meta_data->>'referral_code',
    NULL
  );
  
  -- Convert to uppercase and trim
  IF referral_code_param IS NOT NULL THEN
    referral_code_param := UPPER(TRIM(referral_code_param));
  END IF;
  
  -- Generate unique referral code for new user
  new_referral_code := public.generate_referral_code();
  
  -- If referral code was provided, find the referrer
  IF referral_code_param IS NOT NULL THEN
    SELECT id INTO referrer_id_found
    FROM public.profiles
    WHERE referral_code = referral_code_param;
  END IF;
  
  -- Insert profile with referral code and referrer (if found)
  -- Start with 50 credits (default), will add 20 more if referral found
  INSERT INTO public.profiles (id, email, credits, subscription_plan, referral_code, referred_by)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''), 
    CASE WHEN referrer_id_found IS NOT NULL THEN 70 ELSE 50 END, -- 50 base + 20 referral bonus
    'base',
    new_referral_code,
    referrer_id_found
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  -- If referral was found, process it (award credits)
  IF referrer_id_found IS NOT NULL THEN
    -- Award credits to referrer (new user already got 70 in INSERT above)
    UPDATE public.profiles
    SET credits = credits + 20
    WHERE id = referrer_id_found;
    
    -- Record the referral
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code, credits_awarded_referrer, credits_awarded_referred)
    VALUES (referrer_id_found, NEW.id, referral_code_param, 20, 20)
    ON CONFLICT (referred_id) DO NOTHING;
    
    -- Log credit transactions for both users
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, metadata)
    VALUES 
      (referrer_id_found, 20, 'referral', 'Referral bonus - referred new user', jsonb_build_object('referred_user_id', NEW.id, 'type', 'referrer')),
      (NEW.id, 20, 'referral', 'Referral bonus - signed up with referral code', jsonb_build_object('referrer_id', referrer_id_found, 'type', 'referred'))
    ON CONFLICT DO NOTHING;
  END IF;
  
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
