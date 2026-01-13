-- Fix new user registration to start with NO plan (NULL) instead of 'base'
-- Also ensure referral system works correctly

-- Step 1: Update handle_new_user function to set NULL for subscription_plan
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
  -- subscription_plan is NULL (no plan) for new users
  INSERT INTO public.profiles (id, email, credits, subscription_plan, referral_code, referred_by)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, ''), 
    CASE WHEN referrer_id_found IS NOT NULL THEN 70 ELSE 50 END, -- 50 base + 20 referral bonus
    NULL, -- No plan by default - user must choose a plan
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

-- Step 2: Update existing users who have 'base' plan but no subscription to NULL
-- (Only if they don't have an active subscription)
UPDATE public.profiles 
SET subscription_plan = NULL
WHERE subscription_plan = 'base' 
  AND (subscription_start_date IS NULL OR subscription_start_date > NOW())
  AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '');
