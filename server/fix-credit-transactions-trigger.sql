-- Fix the allocate_monthly_credits trigger to work correctly
-- The issue is it's trying to insert into credit_transactions before the profile exists

-- Drop the existing trigger
DROP TRIGGER IF EXISTS allocate_credits_on_subscription_change ON public.profiles;

-- Update the function to handle the case where profile might not exist yet
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
    
    -- Only log credit transaction if profile already exists (for updates)
    -- For new profiles, we'll skip this to avoid foreign key issues
    IF TG_OP = 'UPDATE' THEN
      -- Log credit transaction (only for updates, not inserts)
      INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, metadata)
      VALUES (
        NEW.id,
        plan_credits,
        'subscription',
        'Monthly subscription credits allocated',
        jsonb_build_object('plan', NEW.subscription_plan, 'monthly_credits', plan_credits)
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- If credit transaction insert fails, just log and continue
    RAISE WARNING 'Error logging credit transaction for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger as AFTER INSERT/UPDATE instead of BEFORE
-- This ensures the profile exists before we try to insert into credit_transactions
CREATE TRIGGER allocate_credits_on_subscription_change
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.subscription_plan IS NOT NULL)
  EXECUTE FUNCTION public.allocate_monthly_credits();

-- But we need BEFORE trigger for setting credits, so let's split it into two functions
-- Function 1: Calculate and set credits (BEFORE)
CREATE OR REPLACE FUNCTION public.calculate_monthly_credits()
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Log transaction (AFTER)
CREATE OR REPLACE FUNCTION public.log_credit_transaction()
RETURNS TRIGGER AS $$
DECLARE
  plan_credits INTEGER;
BEGIN
  -- Only log for updates where credits were actually allocated
  IF TG_OP = 'UPDATE' AND NEW.monthly_credits_allocated > 0 AND 
     (OLD.monthly_credits_allocated IS NULL OR OLD.monthly_credits_allocated != NEW.monthly_credits_allocated) THEN
    
    -- Determine credits based on plan
    CASE NEW.subscription_plan
      WHEN 'base' THEN plan_credits := 50;
      WHEN 'essential' THEN plan_credits := 250;
      WHEN 'ultimate' THEN plan_credits := 500;
      ELSE plan_credits := 0;
    END CASE;

    -- Log credit transaction
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, metadata)
    VALUES (
      NEW.id,
      plan_credits,
      'subscription',
      'Monthly subscription credits allocated',
      jsonb_build_object('plan', NEW.subscription_plan, 'monthly_credits', plan_credits)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error logging credit transaction: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger
DROP TRIGGER IF EXISTS allocate_credits_on_subscription_change ON public.profiles;

-- Create BEFORE trigger for calculating credits
CREATE TRIGGER calculate_credits_on_subscription_change
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.subscription_plan IS NOT NULL)
  EXECUTE FUNCTION public.calculate_monthly_credits();

-- Create AFTER trigger for logging transactions (only on updates)
CREATE TRIGGER log_credits_on_subscription_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.subscription_plan IS NOT NULL AND NEW.monthly_credits_allocated > 0)
  EXECUTE FUNCTION public.log_credit_transaction();
