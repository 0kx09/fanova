-- ============================================
-- FANOVA COMPLETE SYSTEM UPGRADE
-- ============================================
-- This script includes all new features:
-- 1. AI Analysis fields (GPT-5 integration)
-- 2. Atomic credit deduction (race condition fix)
-- 3. Locked reference image (consistency system)
--
-- Date: 2026-01-18
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- ============================================
-- PART 1: AI ANALYSIS FIELDS
-- ============================================
-- Purpose: Store GPT-5 Vision analysis and merged prompts
-- for consistent image generation

ALTER TABLE models
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS merged_prompt TEXT,
ADD COLUMN IF NOT EXISTS reference_images JSONB;

-- Add comments
COMMENT ON COLUMN models.ai_analysis IS 'Array of 3 GPT-5 Vision analysis results for each reference image';
COMMENT ON COLUMN models.merged_prompt IS 'Merged prompt created from all 3 analyses for consistent image generation';
COMMENT ON COLUMN models.reference_images IS 'Array of 3 base64-encoded reference images uploaded by user';

-- Create index for faster queries on models with AI analysis
CREATE INDEX IF NOT EXISTS idx_models_has_ai_analysis ON models ((ai_analysis IS NOT NULL));

SELECT '✅ Part 1 Complete: AI analysis fields added' AS status;

-- ============================================
-- PART 2: ATOMIC CREDIT DEDUCTION
-- ============================================
-- Purpose: Prevent race conditions when deducting credits
-- Returns success status and new credit balance

CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  user_id UUID,
  amount_to_deduct INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  new_credits INTEGER;
BEGIN
  -- Lock the row for this user to prevent concurrent modifications
  SELECT credits INTO current_credits
  FROM profiles
  WHERE id = user_id
  FOR UPDATE;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Check if user has enough credits
  IF current_credits < amount_to_deduct THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'current_credits', current_credits,
      'required', amount_to_deduct
    );
  END IF;

  -- Calculate new credits
  new_credits := current_credits - amount_to_deduct;

  -- Update credits atomically
  UPDATE profiles
  SET credits = new_credits
  WHERE id = user_id;

  -- Return success with new balance
  RETURN json_build_object(
    'success', true,
    'new_credits', new_credits,
    'deducted', amount_to_deduct
  );
END;
$$;

-- Function: Get credits with row lock (for fallback method)
CREATE OR REPLACE FUNCTION get_credits_for_update(
  user_id UUID
)
RETURNS TABLE(credits INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.credits
  FROM profiles p
  WHERE p.id = user_id
  FOR UPDATE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION deduct_credits_atomic(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits_atomic(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_credits_for_update(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credits_for_update(UUID) TO service_role;

-- Add comments
COMMENT ON FUNCTION deduct_credits_atomic IS 'Atomically deduct credits from user account with race condition protection';
COMMENT ON FUNCTION get_credits_for_update IS 'Get user credits with row-level lock for safe updates';

SELECT '✅ Part 2 Complete: Atomic credit functions created' AS status;

-- ============================================
-- PART 3: LOCKED REFERENCE IMAGE
-- ============================================
-- Purpose: Store the selected reference image for
-- consistent future generations

ALTER TABLE models
ADD COLUMN IF NOT EXISTS locked_reference_image TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_models_locked_reference ON models(locked_reference_image);

-- Add comment
COMMENT ON COLUMN models.locked_reference_image IS 'The selected reference image URL used for all future image generations to ensure consistency';

SELECT '✅ Part 3 Complete: Locked reference image field added' AS status;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that all columns exist

DO $$
DECLARE
  ai_analysis_exists BOOLEAN;
  merged_prompt_exists BOOLEAN;
  reference_images_exists BOOLEAN;
  locked_reference_exists BOOLEAN;
  atomic_function_exists BOOLEAN;
BEGIN
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'ai_analysis'
  ) INTO ai_analysis_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'merged_prompt'
  ) INTO merged_prompt_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'reference_images'
  ) INTO reference_images_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'models' AND column_name = 'locked_reference_image'
  ) INTO locked_reference_exists;

  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'deduct_credits_atomic'
  ) INTO atomic_function_exists;

  -- Report status
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ai_analysis column: %', CASE WHEN ai_analysis_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'merged_prompt column: %', CASE WHEN merged_prompt_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'reference_images column: %', CASE WHEN reference_images_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'locked_reference_image column: %', CASE WHEN locked_reference_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'deduct_credits_atomic function: %', CASE WHEN atomic_function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '============================================';
  RAISE NOTICE '';

  -- Final status
  IF ai_analysis_exists AND merged_prompt_exists AND reference_images_exists
     AND locked_reference_exists AND atomic_function_exists THEN
    RAISE NOTICE '🎉 SUCCESS! All features installed correctly!';
  ELSE
    RAISE EXCEPTION '❌ MIGRATION INCOMPLETE! Please check the errors above.';
  END IF;
END $$;

-- ============================================
-- FINAL MESSAGE
-- ============================================

SELECT '
🎉 FANOVA SYSTEM UPGRADE COMPLETE! 🎉

New Features Enabled:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ GPT-5 Vision Integration
   - Analyzes 3 reference images
   - Creates professional prompts
   - Stored in: ai_analysis, merged_prompt, reference_images

✅ Atomic Credit System
   - Prevents race conditions
   - Safe concurrent operations
   - Functions: deduct_credits_atomic, get_credits_for_update

✅ Locked Reference Images
   - Perfect consistency across generations
   - User-selected reference
   - Stored in: locked_reference_image

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:
1. Deploy backend code (pm2 restart fanova-backend)
2. Build frontend (npm run build)
3. Add OPENAI_API_KEY to .env
4. Test model creation flow

Ready to go! 🚀
' AS "INSTALLATION COMPLETE";
