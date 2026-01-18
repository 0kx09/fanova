-- Migration: Add locked reference image field
-- Purpose: Store the selected reference image for consistent future generations
-- Date: 2026-01-18

-- Add locked_reference_image field to models table
ALTER TABLE models
ADD COLUMN IF NOT EXISTS locked_reference_image TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_models_locked_reference ON models(locked_reference_image);

-- Add comment
COMMENT ON COLUMN models.locked_reference_image IS 'The selected reference image URL used for all future image generations to ensure consistency';

-- Migration complete
SELECT 'Migration completed: locked_reference_image field added to models table' AS status;
