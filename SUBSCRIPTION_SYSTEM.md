# Fanova Subscription & Credits System

## Overview

Fanova uses a subscription + credits model where users pay monthly for a plan that includes credits, and can purchase additional credits as needed.

## Implementation Status

### ✅ Completed

1. **Database Schema** (`server/supabase-subscription-schema.sql`)
   - Added subscription plan columns to profiles table
   - Created credit_transactions table for tracking all credit changes
   - Created subscription_history table for plan changes
   - Added triggers for automatic monthly credit allocation

2. **Pricing Service** (`src/services/pricingService.js`)
   - Subscription plan configurations (Base, Essential, Ultimate)
   - Credit recharge options
   - Credit cost calculations based on plan and image type
   - Helper functions for plan management

3. **Supabase Service Updates** (`src/services/supabaseService.js`)
   - `getUserProfile()` - Get user profile with subscription info
   - `deductCredits()` - Deduct credits with transaction logging
   - `addCredits()` - Add credits (for recharges)
   - `updateSubscriptionPlan()` - Change user's subscription
   - `getCreditTransactions()` - View credit history
   - `getSubscriptionHistory()` - View subscription history

### 🔄 In Progress / TODO

4. **Backend Routes** (`server/routes/models.js`)
   - Update image generation endpoints to:
     - Check user's subscription plan
     - Deduct appropriate credits (1 for regular, 15/30 for NSFW based on plan)
     - Return error if insufficient credits
     - Log transactions

5. **Watermarking** (`server/services/watermarkService.js` - to be created)
   - Add watermark to images for Base plan users
   - Use canvas API or image processing library
   - Apply watermark before saving to storage

6. **UI Components** (to be created)
   - Subscription management page (`src/pages/Subscription.js`)
   - Credit recharge modal/component
   - Updated credits display with plan info
   - Plan comparison/upgrade UI

## Subscription Plans

### Base Plan - £9.99/month
- 50 credits/month
- Watermarked images
- Standard generation speed
- NSFW: Not available

### Essential Plan - £19.99/month (Most Popular)
- 250 credits/month
- No watermarks
- Faster generation
- 24/7 customer support
- NSFW: 30 credits per image

### Ultimate Plan - £29.99/month
- 500 credits/month
- No watermarks
- Fastest generation
- Priority 24/7 support
- NSFW: 15 credits per image
- Best value per credit

## Credit Recharges

Users can purchase additional credits without changing plans:
- £4.99 → 50 credits
- £9.99 → 100 credits
- £19.99 → 250 credits

## Credit Costs

- **Regular Images**: 1 credit (all plans)
- **NSFW Images**: 
  - Essential Plan: 30 credits
  - Ultimate Plan: 15 credits
  - Base Plan: Not available

## Database Setup

1. Run `server/supabase-schema.sql` (if not already done)
2. Run `server/supabase-subscription-schema.sql` to add subscription tables
3. Policies are automatically created for RLS

## Next Steps

1. Update backend routes to check credits before generation
2. Implement watermarking service
3. Create subscription management UI
4. Integrate payment processing (Stripe/Paddle)
5. Add email notifications for low credits/subscription renewal

## Testing

To test the system:
1. Set up a test user with a subscription plan
2. Generate images and verify credits are deducted
3. Test NSFW generation (should check plan and cost)
4. Test credit recharge flow
5. Test plan upgrade/downgrade
