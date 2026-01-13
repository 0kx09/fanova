-- Fix Supabase RLS Performance Warnings (Version 2)
-- This script properly fixes both auth_rls_initplan and multiple_permissive_policies warnings
-- Run this in Supabase SQL Editor

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;

-- Consolidated SELECT policy (includes both user and service role access)
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
USING (
  (select auth.uid()) = id
  OR (select auth.jwt()->>'role') = 'service_role'
);

-- Consolidated UPDATE policy (includes both user and service role access)
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
USING (
  (select auth.uid()) = id
  OR (select auth.jwt()->>'role') = 'service_role'
);

-- Consolidated INSERT policy (service role only)
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
WITH CHECK ((select auth.jwt()->>'role') = 'service_role');

-- Consolidated DELETE policy (service role only)
CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================
-- MODELS TABLE
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own models" ON public.models;
DROP POLICY IF EXISTS "Users can create own models" ON public.models;
DROP POLICY IF EXISTS "Users can update own models" ON public.models;
DROP POLICY IF EXISTS "Users can delete own models" ON public.models;
DROP POLICY IF EXISTS "models_select_policy" ON public.models;
DROP POLICY IF EXISTS "models_insert_policy" ON public.models;
DROP POLICY IF EXISTS "models_update_policy" ON public.models;
DROP POLICY IF EXISTS "models_delete_policy" ON public.models;

-- Allow users to view their own models
CREATE POLICY "models_select_policy"
ON public.models
FOR SELECT
USING ((select auth.uid()) = user_id);

-- Allow users to create their own models
CREATE POLICY "models_insert_policy"
ON public.models
FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Allow users to update their own models
CREATE POLICY "models_update_policy"
ON public.models
FOR UPDATE
USING ((select auth.uid()) = user_id);

-- Allow users to delete their own models
CREATE POLICY "models_delete_policy"
ON public.models
FOR DELETE
USING ((select auth.uid()) = user_id);

-- ============================================
-- GENERATED_IMAGES TABLE
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own generated images" ON public.generated_images;
DROP POLICY IF EXISTS "Users can insert own generated images" ON public.generated_images;
DROP POLICY IF EXISTS "Users can update own generated images" ON public.generated_images;
DROP POLICY IF EXISTS "Users can delete own generated images" ON public.generated_images;
DROP POLICY IF EXISTS "generated_images_select_policy" ON public.generated_images;
DROP POLICY IF EXISTS "generated_images_insert_policy" ON public.generated_images;
DROP POLICY IF EXISTS "generated_images_update_policy" ON public.generated_images;
DROP POLICY IF EXISTS "generated_images_delete_policy" ON public.generated_images;

-- Allow users to view their own generated images
CREATE POLICY "generated_images_select_policy"
ON public.generated_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.models
    WHERE models.id = generated_images.model_id
    AND models.user_id = (select auth.uid())
  )
);

-- Allow users to insert their own generated images
CREATE POLICY "generated_images_insert_policy"
ON public.generated_images
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.models
    WHERE models.id = generated_images.model_id
    AND models.user_id = (select auth.uid())
  )
);

-- Allow users to update their own generated images
CREATE POLICY "generated_images_update_policy"
ON public.generated_images
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.models
    WHERE models.id = generated_images.model_id
    AND models.user_id = (select auth.uid())
  )
);

-- Allow users to delete their own generated images
CREATE POLICY "generated_images_delete_policy"
ON public.generated_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.models
    WHERE models.id = generated_images.model_id
    AND models.user_id = (select auth.uid())
  )
);

-- ============================================
-- REFERENCE_IMAGES TABLE
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own reference images" ON public.reference_images;
DROP POLICY IF EXISTS "Users can insert own reference images" ON public.reference_images;
DROP POLICY IF EXISTS "reference_images_select_policy" ON public.reference_images;
DROP POLICY IF EXISTS "reference_images_insert_policy" ON public.reference_images;

-- Allow users to view their own reference images
CREATE POLICY "reference_images_select_policy"
ON public.reference_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.models
    WHERE models.id = reference_images.model_id
    AND models.user_id = (select auth.uid())
  )
);

-- Allow users to insert their own reference images
CREATE POLICY "reference_images_insert_policy"
ON public.reference_images
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.models
    WHERE models.id = reference_images.model_id
    AND models.user_id = (select auth.uid())
  )
);

-- ============================================
-- CREDIT_TRANSACTIONS TABLE
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can insert own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Service role can manage all transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_select_policy" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_insert_policy" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_service_role_modify" ON public.credit_transactions;

-- Consolidated SELECT policy (includes both user and service role access)
CREATE POLICY "credit_transactions_select_policy"
ON public.credit_transactions
FOR SELECT
USING (
  (select auth.uid()) = user_id
  OR (select auth.jwt()->>'role') = 'service_role'
);

-- Consolidated INSERT policy (includes both user and service role access)
CREATE POLICY "credit_transactions_insert_policy"
ON public.credit_transactions
FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id
  OR (select auth.jwt()->>'role') = 'service_role'
);

-- UPDATE policy (service role only)
CREATE POLICY "credit_transactions_update_policy"
ON public.credit_transactions
FOR UPDATE
USING ((select auth.jwt()->>'role') = 'service_role');

-- DELETE policy (service role only)
CREATE POLICY "credit_transactions_delete_policy"
ON public.credit_transactions
FOR DELETE
USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================
-- SUBSCRIPTION_HISTORY TABLE
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own subscription history" ON public.subscription_history;
DROP POLICY IF EXISTS "Users can insert own subscription history" ON public.subscription_history;
DROP POLICY IF EXISTS "Service role can manage all subscription history" ON public.subscription_history;
DROP POLICY IF EXISTS "subscription_history_select_policy" ON public.subscription_history;
DROP POLICY IF EXISTS "subscription_history_insert_policy" ON public.subscription_history;
DROP POLICY IF EXISTS "subscription_history_service_role_modify" ON public.subscription_history;

-- Consolidated SELECT policy (includes both user and service role access)
CREATE POLICY "subscription_history_select_policy"
ON public.subscription_history
FOR SELECT
USING (
  (select auth.uid()) = user_id
  OR (select auth.jwt()->>'role') = 'service_role'
);

-- Consolidated INSERT policy (includes both user and service role access)
CREATE POLICY "subscription_history_insert_policy"
ON public.subscription_history
FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id
  OR (select auth.jwt()->>'role') = 'service_role'
);

-- UPDATE policy (service role only)
CREATE POLICY "subscription_history_update_policy"
ON public.subscription_history
FOR UPDATE
USING ((select auth.jwt()->>'role') = 'service_role');

-- DELETE policy (service role only)
CREATE POLICY "subscription_history_delete_policy"
ON public.subscription_history
FOR DELETE
USING ((select auth.jwt()->>'role') = 'service_role');

-- ============================================
-- Verify the policies were created correctly
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN (
  'profiles',
  'models',
  'generated_images',
  'reference_images',
  'credit_transactions',
  'subscription_history'
)
ORDER BY tablename, cmd, policyname;

-- ============================================
-- Check for any remaining issues
-- ============================================
-- Count policies per table and action to identify duplicates
SELECT
  tablename,
  cmd,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'profiles',
  'models',
  'generated_images',
  'reference_images',
  'credit_transactions',
  'subscription_history'
)
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;
