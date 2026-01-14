# Payment System Setup Instructions

## Overview

The payment system has been completely rewritten to be more reliable and handle free trials correctly. The new system:

- **Directly allocates credits** without relying on database triggers
- **Handles trialing subscriptions** properly (credits allocated immediately during trial)
- **Processes payments immediately** on the frontend (doesn't wait for webhooks)
- **Has automatic retry logic** if processing fails
- **Works with or without webhooks** configured

## What Changed

### Backend Changes (`server/routes/stripe.js`)

1. **Simplified `handleCheckoutCompleted` function**:
   - Directly updates the profile with credits
   - No longer relies on database triggers
   - Handles trialing subscriptions correctly
   - Returns detailed success/error information

2. **Improved error handling**:
   - Better logging at each step
   - Returns structured error responses
   - Verifies updates before completing

3. **Manual processing endpoint**:
   - Now the PRIMARY method for processing payments
   - Webhooks are optional/backup only
   - More reliable than waiting for webhooks

### Frontend Changes (`src/pages/PaymentSuccess.js`)

1. **Immediate processing**:
   - No longer waits 5 seconds for webhooks
   - Processes payment immediately on page load
   - Verifies success before redirecting

2. **Automatic retry logic**:
   - Retries up to 3 times if processing fails
   - Shows retry status to user
   - Better error messages

3. **Better user feedback**:
   - Shows processing status
   - Displays retry attempts
   - Clear error messages with session ID

## Required Environment Variables

Make sure these are set in your `.env` file (in the `server` directory):

```env
# Stripe Configuration (REQUIRED)
# Backend (server/.env):
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...  # Optional - only needed if you want webhooks

# Frontend (root .env or .env.local):
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key

# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Frontend URL (REQUIRED)
FRONTEND_URL=http://localhost:3000  # Or your production URL
```

## Stripe Setup

### 1. Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
   - Add it to `server/.env` as `STRIPE_SECRET_KEY`
4. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - Add it to your frontend `.env` or `.env.local` as `REACT_APP_STRIPE_PUBLISHABLE_KEY`

### 2. Create Products and Prices in Stripe

You need to create 3 products in Stripe (one for each plan):

1. **Base Plan** - £9.99/month - 50 credits
2. **Essential Plan** - £19.99/month - 250 credits  
3. **Ultimate Plan** - £29.99/month - 500 credits (with 1-day free trial)

**Steps:**
1. Go to **Products** in Stripe Dashboard
2. Click **+ Add product**
3. Create each product with:
   - Name: "Base Plan", "Essential Plan", or "Ultimate Plan"
   - Pricing: Recurring, Monthly
   - Price: £9.99, £19.99, or £29.99
   - For Ultimate Plan: Enable "Add a trial period" → 1 day
4. Copy the **Price ID** (starts with `price_...`) for each

### 3. Update Database with Price IDs

You need to add the Stripe Price IDs to your `stripe_price_mapping` table in Supabase:

```sql
-- Insert or update price mappings
INSERT INTO public.stripe_price_mapping (plan_type, price_id)
VALUES 
  ('base', 'price_YOUR_BASE_PRICE_ID'),
  ('essential', 'price_YOUR_ESSENTIAL_PRICE_ID'),
  ('ultimate', 'price_YOUR_ULTIMATE_PRICE_ID')
ON CONFLICT (plan_type) 
DO UPDATE SET price_id = EXCLUDED.price_id;
```

Replace `price_YOUR_...` with your actual Stripe Price IDs.

### 4. (Optional) Set Up Webhooks

Webhooks are **optional** - the system works without them. But if you want them as a backup:

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. Set endpoint URL to: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

**Note:** For local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:
```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

## Database Setup

Make sure your Supabase database has these tables and columns:

### Required Tables

1. **profiles** table with columns:
   - `id` (UUID, primary key)
   - `email` (text)
   - `credits` (integer, default 0)
   - `subscription_plan` (text: 'base', 'essential', 'ultimate', or null)
   - `subscription_start_date` (timestamp)
   - `subscription_renewal_date` (timestamp)
   - `monthly_credits_allocated` (integer, default 0)
   - `stripe_customer_id` (text, nullable)
   - `stripe_subscription_id` (text, nullable)

2. **stripe_price_mapping** table:
   ```sql
   CREATE TABLE IF NOT EXISTS public.stripe_price_mapping (
     plan_type TEXT PRIMARY KEY CHECK (plan_type IN ('base', 'essential', 'ultimate')),
     price_id TEXT NOT NULL UNIQUE
   );
   ```

3. **subscription_history** table (for logging)
4. **credit_transactions** table (for logging)

## Testing the Payment System

### 1. Test with Stripe Test Cards

Use Stripe's test cards:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- Use any future expiry date and any 3-digit CVC

### 2. Test Free Trial (Ultimate Plan)

1. Select Ultimate Plan
2. Complete checkout (no payment required during trial)
3. Verify:
   - Subscription status is "trialing"
   - Credits are allocated immediately (500 credits)
   - Profile shows `subscription_plan: 'ultimate'`

### 3. Verify Credits Allocation

After payment:
1. Check user profile in Supabase
2. Verify:
   - `subscription_plan` is set correctly
   - `credits` is increased by the plan's monthly credits
   - `monthly_credits_allocated` is set
   - `stripe_subscription_id` is set

## Troubleshooting

### Payment says "complete" but no credits

1. **Check server logs** - Look for errors in `handleCheckoutCompleted`
2. **Check Supabase RLS policies** - Make sure service role can update profiles
3. **Verify user ID** - Check that `user_id` is in session metadata
4. **Check database** - Verify the profile exists and is accessible

### Manual processing fails

1. **Check session status** - Verify session is actually "complete"
2. **Check subscription** - Verify subscription was created in Stripe
3. **Check logs** - Look for specific error messages
4. **Verify plan type** - Make sure plan type is in metadata or price mapping

### Webhook not working

**This is OK!** The system works without webhooks. Manual processing is the primary method.

If you want webhooks to work:
1. Verify `STRIPE_WEBHOOK_SECRET` is set
2. Check webhook endpoint is accessible
3. Verify webhook signature in Stripe Dashboard
4. Check server logs for webhook errors

## Production Checklist

Before going live:

- [ ] Switch to Stripe **Live** keys (not test keys)
- [ ] Update `FRONTEND_URL` to production URL
- [ ] Set up webhook endpoint in production
- [ ] Test with real payment method (small amount)
- [ ] Verify credits are allocated correctly
- [ ] Test free trial flow
- [ ] Monitor server logs for errors
- [ ] Set up error alerting (optional)

## Support

If you encounter issues:

1. Check server logs for detailed error messages
2. Verify all environment variables are set
3. Check Stripe Dashboard for payment/subscription status
4. Verify database tables and RLS policies
5. Test with Stripe test cards first

The new system is much more reliable and should handle all edge cases including free trials!
