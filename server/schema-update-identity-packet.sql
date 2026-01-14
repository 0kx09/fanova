-- Add identity_packet column to models table
-- This stores the locked identity information for consistent generation

ALTER TABLE models
ADD COLUMN IF NOT EXISTS identity_packet JSONB DEFAULT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_models_identity_packet ON models USING GIN (identity_packet);

-- Add comment explaining the column
COMMENT ON COLUMN models.identity_packet IS 'Identity packet for locked generation with reference reinjection. Contains persona_id, identity_prompt, and reference_images.';

-- Example identity_packet structure:
-- {
--   "persona_id": "uuid",
--   "identity_prompt": "Detailed description of facial features and identity markers",
--   "reference_images": ["url1", "url2", "url3"],
--   "created_at": "2026-01-14T00:00:00.000Z",
--   "locked": true
-- }
