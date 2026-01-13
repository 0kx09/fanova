-- Fix Supabase RLS Performance Warnings
-- This script fixes auth_rls_initplan and multiple_permissive_policies warnings
-- Run this in Supabase SQL Editor

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

-- Consolidated SELECT policy (fixes multiple permissive policies warning)
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
USING (
  (select auth.uid()) = id
  OR (select auth.jwt() ->> 'role') = 'service_role'
);

-- Consolidated UPDATE policy (fixes multiple permissive policies warning)
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
USING (
  (select auth.uid()) = id
  OR (select auth.jwt() ->> 'role') = 'service_role'
);

-- Service role can insert/delete
CREATE POLICY "profiles_service_role_all"
ON public.profiles
FOR ALL
USING ((select auth.jwt() ->> 'role') = 'service_role');

-- ============================================
-- MODELS TABLE
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own models" ON public.models;
DROP POLICY IF EXISTS "Users can create own models" ON public.models;
DROP POLICY IF EXISTS "Users can update own models" ON public.models;
DROP POLICY IF EXISTS "Users can delete own models" ON public.models;

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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own generated images" ON public.generated_images;
DROP POLICY IF EXISTS "Users can insert own generated images" ON public.generated_images;
DROP POLICY IF EXISTS "Users can update own generated images" ON public.generated_images;
DROP POLICY IF EXISTS "Users can delete own generated images" ON public.generated_images;

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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own reference images" ON public.reference_images;
DROP POLICY IF EXISTS "Users can insert own reference images" ON public.reference_images;

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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can insert own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Service role can manage all transactions" ON public.credit_transactions;

-- Consolidated SELECT policy (fixes multiple permissive policies warning)
CREATE POLICY "credit_transactions_select_policy"
ON public.credit_transactions
FOR SELECT
USING (
  (select auth.uid()) = user_id
  OR (select auth.jwt() ->> 'role') = 'service_role'
);

-- Consolidated INSERT policy (fixes multiple permissive policies warning)
CREATE POLICY "credit_transactions_insert_policy"
ON public.credit_transactions
FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id
  OR (select auth.jwt() ->> 'role') = 'service_role'
);

-- Service role can update/delete
CREATE POLICY "credit_transactions_service_role_modify"
ON public.credit_transactions
FOR ALL
USING ((select auth.jwt() ->> 'role') = 'service_role');

-- ============================================
-- SUBSCRIPTION_HISTORY TABLE
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own subscription history" ON public.subscription_history;
DROP POLICY IF EXISTS "Users can insert own subscription history" ON public.subscription_history;
DROP POLICY IF EXISTS "Service role can manage all subscription history" ON public.subscription_history;

-- Consolidated SELECT policy (fixes multiple permissive policies warning)
CREATE POLICY "subscription_history_select_policy"
ON public.subscription_history
FOR SELECT
USING (
  (select auth.uid()) = user_id
  OR (select auth.jwt() ->> 'role') = 'service_role'
);

-- Consolidated INSERT policy (fixes multiple permissive policies warning)
CREATE POLICY "subscription_history_insert_policy"
ON public.subscription_history
FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id
  OR (select auth.jwt() ->> 'role') = 'service_role'
);

-- Service role can update/delete
CREATE POLICY "subscription_history_service_role_modify"
ON public.subscription_history
FOR ALL
USING ((select auth.jwt() ->> 'role') = 'service_role');

-- ============================================
-- Verify the policies were created correctly
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN (
  'profiles',
  'models',
  'generated_images',
  'reference_images',
  'credit_transactions',
  'subscription_history'
)
ORDER BY tablename, policyname;
