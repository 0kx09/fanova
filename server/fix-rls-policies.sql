-- Fix RLS policies for credit_transactions and subscription_history tables
-- Run this in Supabase SQL Editor

-- ============================================
-- CREDIT_TRANSACTIONS TABLE
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can insert own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Service role can manage all transactions" ON public.credit_transactions;

-- Allow users to view their own transactions
CREATE POLICY "Users can view own credit transactions"
ON public.credit_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own transactions
CREATE POLICY "Users can insert own credit transactions"
ON public.credit_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow service role full access (for webhooks)
CREATE POLICY "Service role can manage all transactions"
ON public.credit_transactions
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- SUBSCRIPTION_HISTORY TABLE
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own subscription history" ON public.subscription_history;
DROP POLICY IF EXISTS "Users can insert own subscription history" ON public.subscription_history;
DROP POLICY IF EXISTS "Service role can manage all subscription history" ON public.subscription_history;

-- Allow users to view their own subscription history
CREATE POLICY "Users can view own subscription history"
ON public.subscription_history
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own subscription history
CREATE POLICY "Users can insert own subscription history"
ON public.subscription_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow service role full access (for webhooks)
CREATE POLICY "Service role can manage all subscription history"
ON public.subscription_history
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- PROFILES TABLE (ensure proper policies exist)
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Allow service role full access
CREATE POLICY "Service role can manage all profiles"
ON public.profiles
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- Verify the policies were created
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('credit_transactions', 'subscription_history', 'profiles')
ORDER BY tablename, policyname;
