-- Migration: Remove index on locked_reference_image
-- Purpose: Fix PostgreSQL index size limit error (8191 bytes max)
-- Issue: locked_reference_image TEXT can store long URLs/base64 that exceed B-tree index limit
-- Solution: Drop the index since we don't query by this field - only by model ID
-- Date: 2026-01-18

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_models_locked_reference;

-- Migration complete
SELECT 'Migration completed: Index removed from locked_reference_image (no longer needed)' AS status;
