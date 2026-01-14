# Fix User Profile Defaults and Trigger

## Problem
New users are being created with incorrect values:
- ❌ 100 credits (should be 0)
- ❌ 'base' plan (should be NULL)
- ❌ monthly_credits_allocated >= 100 (should be 0)

## Solution Files

1. **`investigate-triggers.sql`** - Run this FIRST to check current state
2. **`fix-user-trigger-and-defaults.sql`** - Run this to apply all fixes

## Execution Steps

### Step 1: Investigate Current State
Open Supabase SQL Editor and run `investigate-triggers.sql` to see:
- What triggers exist
- Current column defaults
- Current trigger function definition
- How many users have incorrect values

### Step 2: Apply Fixes
Run `fix-user-trigger-and-defaults.sql` which will:
1. ✅ Fix the `handle_new_user()` trigger function
2. ✅ Update column defaults to correct values
3. ✅ Clean up existing users with incorrect data

### Step 3: Verify
After running the fix, verify with these queries:

```sql
-- Should return 0 or very few rows
SELECT id, email, credits, subscription_plan, monthly_credits_allocated
FROM profiles
WHERE subscription_plan = 'base'
LIMIT 10;

-- Check column defaults are correct
SELECT 
    column_name, 
    column_default,
    data_type
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('credits', 'subscription_plan', 'monthly_credits_allocated')
ORDER BY column_name;
```

### Step 4: Test New User Creation
1. Delete test user `tt@tt.com` from `auth.users` table
2. Delete corresponding profile from `profiles` table
3. Create new account via frontend
4. Verify new account has: `credits=0`, `subscription_plan=null`, `monthly_credits_allocated=0`

## Expected Results

### Before Fix:
- New users: credits=100, subscription_plan='base', monthly_credits_allocated=100
- Column defaults: credits=100, subscription_plan='base'

### After Fix:
- New users: credits=0, subscription_plan=NULL, monthly_credits_allocated=0
- Column defaults: credits=0, subscription_plan=NULL, monthly_credits_allocated=0
- Existing incorrect users: Reset to correct values

## What Gets Fixed

1. **Trigger Function** (`handle_new_user`)
   - Changed credits from 100 → 0
   - Changed subscription_plan from 'base' → NULL
   - Changed monthly_credits_allocated from 100 → 0

2. **Column Defaults**
   - `credits` default: 100 → 0
   - `subscription_plan` default: 'base' → NULL
   - `monthly_credits_allocated` default: 100 → 0

3. **Existing Data Cleanup**
   - Users with `subscription_plan='base'` AND `credits >= 100` are reset
   - All reset to: credits=0, subscription_plan=NULL, monthly_credits_allocated=0

## Notes

- The migration uses `ON CONFLICT DO NOTHING` to prevent errors if profile already exists
- Existing users with legitimate subscriptions are NOT affected
- Only users with 'base' plan AND high credits (>=100) are reset
