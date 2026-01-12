-- Subscription and Credits System Schema
-- Run this after the main supabase-schema.sql

-- Add subscription plan columns to profiles table
DO $$
BEGIN
  -- Add subscription_plan column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_plan TEXT DEFAULT 'base' CHECK (subscription_plan IN ('base', 'essential', 'ultimate'));
  END IF;

  -- Add subscription_start_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'subscription_start_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_start_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add subscription_renewal_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'subscription_renewal_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_renewal_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add monthly_credits_allocated column (credits given at start of month)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'monthly_credits_allocated'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN monthly_credits_allocated INTEGER DEFAULT 0;
  END IF;

  -- Add last_credit_allocation_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_credit_allocation_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_credit_allocation_date TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create credit_transactions table to track all credit changes
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- Positive for credits added, negative for credits spent
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'recharge', 'generation', 'refund', 'adjustment')),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store additional info like plan name, image type, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscription_history table
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('base', 'essential', 'ultimate')),
  action TEXT NOT NULL CHECK (action IN ('started', 'upgraded', 'downgraded', 'cancelled', 'renewed')),
  amount_paid NUMERIC(10, 2), -- Amount in GBP
  credits_allocated INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Credit transactions policies
CREATE POLICY "Users can view own credit transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Subscription history policies
CREATE POLICY "Users can view own subscription history"
  ON public.subscription_history FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON public.subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON public.subscription_history(created_at DESC);

-- Function to allocate monthly credits based on plan
CREATE OR REPLACE FUNCTION public.allocate_monthly_credits()
RETURNS TRIGGER AS $$
DECLARE
  plan_credits INTEGER;
BEGIN
  -- Determine credits based on plan
  CASE NEW.subscription_plan
    WHEN 'base' THEN plan_credits := 50;
    WHEN 'essential' THEN plan_credits := 250;
    WHEN 'ultimate' THEN plan_credits := 500;
    ELSE plan_credits := 0;
  END CASE;

  -- Check if it's a new subscription or renewal
  IF NEW.subscription_start_date IS NULL OR 
     (NEW.subscription_renewal_date IS NOT NULL AND 
      NEW.subscription_renewal_date <= NOW() AND
      (NEW.last_credit_allocation_date IS NULL OR NEW.last_credit_allocation_date < NEW.subscription_renewal_date)) THEN
    -- Allocate credits
    NEW.credits := COALESCE(NEW.credits, 0) + plan_credits;
    NEW.monthly_credits_allocated := plan_credits;
    NEW.last_credit_allocation_date := NOW();
    
    -- Log credit transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, metadata)
    VALUES (
      NEW.id,
      plan_credits,
      'subscription',
      'Monthly subscription credits allocated',
      jsonb_build_object('plan', NEW.subscription_plan, 'monthly_credits', plan_credits)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to allocate credits when subscription changes
CREATE TRIGGER allocate_credits_on_subscription_change
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.subscription_plan IS NOT NULL)
  EXECUTE FUNCTION public.allocate_monthly_credits();
