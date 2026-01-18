-- Migration: Add AI Analysis fields to models table
-- Purpose: Store GPT-4 Vision analysis and merged prompts for consistent image generation
-- Date: 2026-01-18

-- Add new columns for AI-powered model generation
ALTER TABLE models
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS merged_prompt TEXT,
ADD COLUMN IF NOT EXISTS reference_images JSONB;

-- Add comments
COMMENT ON COLUMN models.ai_analysis IS 'Array of 3 GPT-4 Vision analysis results for each reference image';
COMMENT ON COLUMN models.merged_prompt IS 'Merged prompt created from all 3 analyses for consistent image generation';
COMMENT ON COLUMN models.reference_images IS 'Array of 3 base64-encoded reference images uploaded by user';

-- Create index for faster queries on models with AI analysis
CREATE INDEX IF NOT EXISTS idx_models_has_ai_analysis ON models ((ai_analysis IS NOT NULL));

-- Migration complete
SELECT 'Migration completed: AI analysis fields added to models table' AS status;
