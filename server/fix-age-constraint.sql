-- Fix age constraint to allow NULL values
-- Age is optional, but if provided, must be >= 18

-- Drop the existing constraint
ALTER TABLE public.models 
DROP CONSTRAINT IF EXISTS models_age_check;

-- Add new constraint that allows NULL
ALTER TABLE public.models 
ADD CONSTRAINT models_age_check 
CHECK (age IS NULL OR age >= 18);
