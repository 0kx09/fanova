# Stripe Product Setup Guide

## Quick Start

Follow these steps to recreate your Stripe products in production:

### Step 1: Verify Current State

First, check what products (if any) currently exist:

```bash
cd c:\Fanova
node server/scripts/verify-stripe-products.js
```

This will show:
- ✅ All active products in your Stripe account
- 💾 Price mappings in your database
- 🔄 Consistency check between Stripe and database

### Step 2: Create Products

Run the setup script to create your subscription products:

```bash
node server/scripts/setup-stripe-products.js
```

This will create:
- **Essential Plan**: $19.99/month, 250 credits
- **Ultimate Plan**: $29.99/month, 500 credits (1-day trial)

The script will:
1. Create products in Stripe
2. Create recurring prices for each product
3. Save price IDs to your database
4. Show you a summary with the new price IDs

### Step 3: Update Frontend

After running the setup script, you'll see output like:

```
FRONTEND CODE SNIPPET:
const STRIPE_PRICES = {
  essential: 'price_xxxxxxxxxxxxx',
  ultimate: 'price_xxxxxxxxxxxxx',
};
```

**Update your frontend pricing configuration** with these new price IDs.

Find the file where STRIPE_PRICES is defined (likely in a pricing service file) and replace the old price IDs with the new ones.

## Pricing Plans

### Base Plan (Free)
- **Cost**: $0
- **Credits**: 0 (pay-as-you-go)
- **No Stripe product needed**

### Essential Plan
- **Cost**: $19.99/month
- **Credits**: 250/month
- **Features**:
  - High-quality AI generation
  - Unlimited models
  - Chat generation
  - Priority support

### Ultimate Plan
- **Cost**: $29.99/month
- **Credits**: 500/month
- **Trial**: 1-day free trial
- **Features**:
  - NSFW content generation
  - High-quality AI generation
  - Unlimited models
  - Chat generation
  - Priority support

## Important Notes

### Production vs Test Mode

- The scripts automatically detect your Stripe mode based on your API key
- **Test keys** start with `sk_test_`
- **Live/Production keys** start with `sk_live_`

Make sure you're using the correct key in your `.env` file:

```bash
# For production
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx

# For testing
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

### Database Table

The scripts save price mappings to the `stripe_price_mapping` table in Supabase.

**Table structure:**
```sql
CREATE TABLE stripe_price_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_id TEXT UNIQUE NOT NULL,
  product_id TEXT,
  plan_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  interval TEXT DEFAULT 'month',
  monthly_credits INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

If this table doesn't exist, create it first.

### Webhooks

After creating products, make sure your Stripe webhooks are configured:

1. Go to [Stripe Webhooks Dashboard](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://usefanova.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret
5. Add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

## Troubleshooting

### "No products found"

If verification shows no products:
- You're in the right place - just run the setup script
- Make sure your STRIPE_SECRET_KEY is correct in `.env`

### "Price not found in Stripe"

If you see errors about prices not being found:
- Your database has old price IDs from test mode
- Run the setup script to create new products and update the database

### "STRIPE_SECRET_KEY not found"

Make sure your `.env` file has the Stripe secret key:
```bash
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```

### Products created but not showing in app

1. Make sure you updated the frontend with new price IDs
2. Clear your browser cache
3. Restart your frontend dev server

## Testing Checkout Flow

After setup:

1. Go to your app's pricing page
2. Click "Subscribe" on Essential or Ultimate
3. Use Stripe test cards (in test mode):
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
4. Check Stripe Dashboard to verify the subscription was created
5. Check your database to verify credits were allocated

## Stripe Dashboard Links

Quick access to your Stripe resources:

- [Products](https://dashboard.stripe.com/products)
- [Prices](https://dashboard.stripe.com/prices)
- [Subscriptions](https://dashboard.stripe.com/subscriptions)
- [Webhooks](https://dashboard.stripe.com/webhooks)
- [API Keys](https://dashboard.stripe.com/apikeys)
- [Test Mode Toggle](https://dashboard.stripe.com/test/dashboard) (top right corner)

## Need Help?

If you encounter issues:
1. Run the verification script to diagnose
2. Check the Stripe Dashboard for errors
3. Review server logs for detailed error messages
4. Ensure your Stripe account is activated for live mode
