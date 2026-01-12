-- Create table to map Stripe price IDs to plan types
CREATE TABLE IF NOT EXISTS public.stripe_price_mapping (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_type TEXT NOT NULL UNIQUE,
  price_id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'gbp',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add stripe_customer_id and stripe_subscription_id to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_price_mapping_price_id ON public.stripe_price_mapping(price_id);
CREATE INDEX IF NOT EXISTS idx_stripe_price_mapping_plan_type ON public.stripe_price_mapping(plan_type);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- RLS policies
ALTER TABLE public.stripe_price_mapping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for price mappings" ON public.stripe_price_mapping;
CREATE POLICY "Public read access for price mappings" ON public.stripe_price_mapping FOR SELECT TO public USING (true);
