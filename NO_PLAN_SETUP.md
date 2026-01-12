# No Plan Registration Setup

This document explains the changes made to ensure new users start with **no subscription plan** and **zero credits**, but can create their **first 3 images for free**.

## Changes Made

### 1. Database Schema Updates

**File: `server/fix-new-user-no-plan.sql`**

- Updated `handle_new_user()` function to set:
  - `credits = 0` (instead of 50)
  - `subscription_plan = NULL` (instead of 'base')
- Made `subscription_plan` column nullable
- Updated default credits to 0

### 2. Backend Credit Service

**File: `server/services/creditService.js`**

- Added `countUserGeneratedImages()` function to track how many images a user has generated
- Updated `checkAndDeductForGeneration()` to:
  - Check if user has no plan (`subscription_plan` is `NULL`)
  - Count existing generated images
  - Allow first 3 images **free** for users with no plan
  - Require subscription after 3 free images are used
  - Block NSFW generation for users with no plan

### 3. Frontend Services

**Files Updated:**
- `src/services/supabaseService.js`: Updated `getUserProfile()` to return `null` for `subscription_plan` instead of defaulting to 'base'
- `src/services/pricingService.js`: Updated functions to handle `null` planType:
  - `getImageGenerationCost()`: Returns cost but backend handles free images
  - `canGenerateNsfw()`: Returns `false` for null plan
  - `getPlanDetails()`: Returns `null` for no plan
- `src/services/imageGenerationService.js`: Updated `checkCreditsForGeneration()` to allow requests for users with no plan (backend handles free check)

### 4. UI Components

**Files Updated:**
- `src/pages/DashboardNew.js`: 
  - Displays "No Plan" instead of plan name when `subscription_plan` is `null`
  - Defaults to 0 credits instead of 10
- `src/pages/ModelView.js`: 
  - Updated to handle `null` subscription plan
  - Defaults to 0 credits

## Setup Instructions

### Step 1: Run SQL Migration

Execute the SQL script in your Supabase SQL Editor:

```sql
-- Run: server/fix-new-user-no-plan.sql
```

This will:
1. Make `subscription_plan` nullable
2. Update `handle_new_user()` function
3. Set default credits to 0
4. Update existing users who have 'base' plan but no subscription to `NULL`

### Step 2: Verify Changes

1. **Test New User Registration:**
   - Register a new user
   - Check that `profiles` table shows:
     - `credits = 0`
     - `subscription_plan = NULL`

2. **Test Free Image Generation:**
   - Create a new model
   - Generate initial 3 images (should be free)
   - Try to generate a 4th image (should require subscription)

3. **Test UI Display:**
   - Dashboard should show "No Plan" for new users
   - Credits should show 0

## How It Works

### For New Users (No Plan):

1. **Registration:**
   - User registers → `credits = 0`, `subscription_plan = NULL`

2. **First 3 Images (Free):**
   - User creates model and generates initial 3 images
   - Backend checks: `countUserGeneratedImages() < 3`
   - If true: Images are generated **free** (no credit deduction)
   - Transaction is logged with `amount = 0` and `isFree = true`

3. **After 3 Images:**
   - User tries to generate 4th image
   - Backend checks: `countUserGeneratedImages() >= 3`
   - Error returned: "You have used your 3 free images. Please subscribe to a plan to continue generating images."

4. **Subscription Required:**
   - User must select a plan during model creation flow (after selecting initial image)
   - Or subscribe via Settings → Subscription page

### For Users With Plans:

- Normal credit checking and deduction applies
- No free images (they already have a subscription)

## Important Notes

- **NSFW Generation:** Always requires a subscription plan (Essential or Ultimate)
- **Model Creation:** Still requires credits (50) - this is separate from the 3 free images
- **Free Images Count:** Based on total images generated across all models for the user
- **Backend Validation:** The backend (`checkAndDeductForGeneration`) is the source of truth for free image allowance

## Troubleshooting

### Issue: New users still have 'base' plan

**Solution:** Run the SQL migration script again, or manually update:
```sql
UPDATE profiles 
SET subscription_plan = NULL 
WHERE subscription_plan = 'base' 
  AND stripe_subscription_id IS NULL;
```

### Issue: Free images not working

**Check:**
1. User has `subscription_plan = NULL` in database
2. `countUserGeneratedImages()` is working correctly
3. Backend logs show "allowing free generation" message

### Issue: UI shows "undefined" for plan

**Solution:** Ensure `getPlanDetails()` returns `null` and UI handles it:
```javascript
{subscriptionPlan ? (getPlanDetails(subscriptionPlan)?.name || 'No Plan') : 'No Plan'}
```
