# Stripe Production Migration Guide

This guide will help you migrate from Stripe test mode to production mode and create products in production.

## Prerequisites

1. ✅ Stripe Live API keys ready
2. ✅ Database table `stripe_price_mapping` exists (created via SQL migration)
3. ✅ Backend environment variables configured

## Step-by-Step Migration

### 1. Update Environment Variables FIRST

**IMPORTANT:** You must set your production Stripe keys BEFORE creating products!

#### Backend (`server/.env`)

Update your Stripe secret key to production:

```env
# OLD (Test Mode)
# STRIPE_SECRET_KEY=sk_test_...

# NEW (Production Mode)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
```

**How to get your Live Secret Key:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Live mode** (toggle in top right)
3. Navigate to **Developers** → **API keys**
4. Copy the **Secret key** (starts with `sk_live_...`)

#### Frontend (Root `.env` or `.env.local`)

Update your Stripe publishable key:

```env
# OLD (Test Mode)
# REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...

# NEW (Production Mode)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
```

**How to get your Live Publishable Key:**
1. Same location as above in Stripe Dashboard
2. Copy the **Publishable key** (starts with `pk_live_...`)

### 2. Create Products in Production Mode

Now that your environment variables are set to production keys, create the products:

```bash
cd server
node scripts/create-stripe-products.js
```

**What this script does:**
- ✅ Creates 3 products in Stripe Production:
  - **Base Plan** - £9.99/month - 50 credits
  - **Essential Plan** - £19.99/month - 250 credits
  - **Ultimate Plan** - £29.99/month - 500 credits
- ✅ Creates recurring monthly prices for each product
- ✅ Automatically updates the `stripe_price_mapping` table in your database with the new price IDs

**The script will:**
- Verify you're using a LIVE Stripe key (will warn if using test key)
- Check that the database table exists
- Create all products and prices
- Store the price IDs in your Supabase database

**Note:** The Ultimate Plan will need an additional step for the free trial. See step 3 below.

### 3. Configure Ultimate Plan Free Trial (Optional)

If you want the Ultimate Plan to have a 1-day free trial, run this additional script:

```bash
cd server
node scripts/create-ultimate-plan-with-trial.js
```

This will update the Ultimate Plan to support the 1-day free trial (the trial period is configured in the checkout session by the backend code).

#### Backend (`server/.env`)

Update your Stripe secret key from test to live:

```env
# OLD (Test Mode)
# STRIPE_SECRET_KEY=sk_test_...

# NEW (Production Mode)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
```

**How to get your Live Secret Key:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Live mode** (toggle in top right)
3. Navigate to **Developers** → **API keys**
4. Copy the **Secret key** (starts with `sk_live_...`)

#### Frontend (Root `.env` or `.env.local`)

Update your Stripe publishable key:

```env
# OLD (Test Mode)
# REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...

# NEW (Production Mode)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
```

**How to get your Live Publishable Key:**
1. Same location as above in Stripe Dashboard
2. Copy the **Publishable key** (starts with `pk_live_...`)

### 4. Verify Products Were Created

After running the script, verify everything worked:

1. **Check Stripe Dashboard:**
   - Go to **Products** in Stripe Dashboard (Live mode)
   - You should see 3 products: Base Plan, Essential Plan, Ultimate Plan
   - Click each product to see its price ID

2. **Check Database:**
   - Run this SQL in Supabase SQL Editor to verify:

```sql
SELECT plan_type, price_id, product_id, amount, currency 
FROM public.stripe_price_mapping
ORDER BY plan_type;
```

You should see:
- `base` → price_id (starts with `price_...`)
- `essential` → price_id
- `ultimate` → price_id

3. **Alternative: Update Existing Products (If Needed)**

If you already have products in Stripe and just need to update the database with their price IDs:

```bash
cd server
node scripts/update-production-price-ids.js
```

This script will:
- ✅ Verify you're using a live Stripe key
- ✅ Fetch all existing products from Stripe Production
- ✅ Match products to plan types (base, essential, ultimate)
- ✅ Update the `stripe_price_mapping` table with the price IDs

### 5. Update Webhook Endpoint (If Using Webhooks)

If you have webhooks configured:

1. Go to **Developers** → **Webhooks** in Stripe Dashboard (Live mode)
2. Create a new endpoint or update existing one:
   - Endpoint URL: `https://usefanova.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
3. Copy the new **Signing secret** (starts with `whsec_...`)
4. Update `server/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
```

**Important:** You cannot use test mode webhook secrets with live mode keys. You must create a new webhook endpoint in live mode.

### 6. Verify Configuration

#### Check Backend

After updating environment variables, restart your server and verify:

```bash
cd server
npm start
```

Check the logs - you should not see any warnings about missing Stripe keys.

#### Check Frontend

Rebuild your frontend with the new publishable key:

```bash
npm run build
```

#### Test in Production

1. **Test Checkout Flow:**
   - Go to subscription page
   - Select a plan
   - Verify the Stripe checkout loads correctly

2. **Test Payment:**
   - Use a real payment method (be careful - this is real money!)
   - Or use Stripe's test mode in a separate environment for testing

3. **Verify Database:**
   - Check that subscriptions are created correctly
   - Verify credits are allocated properly

### 7. Important Notes

⚠️ **Security:**
- Never commit live Stripe keys to version control
- Keep test and production keys separate
- Use environment variables for all keys

⚠️ **Testing:**
- Test thoroughly before going live
- Consider keeping a test environment with test keys
- Monitor Stripe Dashboard for any errors

⚠️ **Customers:**
- Existing test mode customers will not work with production
- You'll need to have users subscribe again in production mode
- Consider communicating this to existing users if migrating

### 8. Rollback Plan

If something goes wrong, you can temporarily switch back:

1. Change environment variables back to test keys
2. Update database with test price IDs
3. Investigate the issue
4. Fix and re-deploy

## Verification Checklist

- [ ] Backend `.env` has `STRIPE_SECRET_KEY=sk_live_...`
- [ ] Frontend `.env` has `REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...`
- [ ] Products created in Stripe Production Mode (run `create-stripe-products.js`)
- [ ] Database has production price IDs in `stripe_price_mapping` table
- [ ] Verified products in Stripe Dashboard
- [ ] Webhook endpoint created in live mode (if using webhooks)
- [ ] Webhook secret updated in backend `.env` (if using webhooks)
- [ ] Server restarted with new environment variables
- [ ] Frontend rebuilt with new publishable key
- [ ] Tested checkout flow in production
- [ ] Verified subscription creation works
- [ ] Verified credits are allocated correctly

## Troubleshooting

### "Invalid API key" error
- Verify you're using `sk_live_...` for secret key (not `sk_test_...`)
- Verify you're using `pk_live_...` for publishable key (not `pk_test_...`)
- Make sure environment variables are loaded correctly

### "Price ID not found" error
- Run the update script: `node server/scripts/update-production-price-ids.js`
- Or manually verify price IDs in database match Stripe Dashboard

### Webhook signature verification failed
- Make sure you're using the live mode webhook secret (`whsec_...`)
- Verify the webhook endpoint URL is correct
- Check that events are selected correctly in Stripe Dashboard

### Customers not created
- Verify your Stripe secret key has proper permissions
- Check server logs for specific error messages
- Verify Supabase connection is working

## Support

If you encounter issues:
1. Check Stripe Dashboard → **Logs** for API errors
2. Check server logs for backend errors
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly
