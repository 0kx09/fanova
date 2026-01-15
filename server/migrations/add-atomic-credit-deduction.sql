-- Migration: Add atomic credit deduction functions
-- Purpose: Prevent race conditions when deducting credits
-- Date: 2026-01-15

-- Function: Atomically deduct credits from user account
-- Returns success status and new credit balance
-- Prevents race conditions by using row-level locking
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

-- Add comment
COMMENT ON FUNCTION deduct_credits_atomic IS 'Atomically deduct credits from user account with race condition protection';
COMMENT ON FUNCTION get_credits_for_update IS 'Get user credits with row-level lock for safe updates';
