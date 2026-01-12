# Stripe Quick Start Guide

Follow these steps to set up Stripe for Fanova.

## Step 1: Create a Stripe Account

1. Go to https://stripe.com
2. Click "Sign up" and create an account
3. Complete the account setup (you can use test mode for now)

## Step 2: Get Your API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Make sure you're in **Test mode** (toggle in the top right)
3. Copy your **Publishable key** (starts with `pk_test_...`)
4. Click "Reveal test key" and copy your **Secret key** (starts with `sk_test_...`)

## Step 3: Add Keys to Your Project

### Backend (server/.env)

Open or create `server/.env` and add:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
FRONTEND_URL=http://localhost:3000
```

### Frontend (root .env)

Create or open `.env` in the root directory and add:

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
REACT_APP_API_URL=http://localhost:5000/api
```

## Step 4: Run Database Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `server/supabase-stripe-schema.sql`
5. Click **Run** to execute the SQL

## Step 5: Create Stripe Products and Prices

You have two options:

### Option A: Use the Script (Recommended)

1. Make sure your `server/.env` has `STRIPE_SECRET_KEY` set
2. Open terminal in the project root
3. Run:

```bash
cd server
node scripts/create-stripe-products.js
```

This will create:
- Base Plan (£9.99/month)
- Essential Plan (£19.99/month)
- Ultimate Plan (£29.99/month)

### Option B: Create Manually in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Click **+ Add product** for each plan:

**Base Plan:**
- Name: `Base Plan`
- Description: `50 credits per month`
- Pricing: Recurring, £9.99, Monthly
- Copy the Price ID (starts with `price_...`)

**Essential Plan:**
- Name: `Essential Plan`
- Description: `250 credits per month`
- Pricing: Recurring, £19.99, Monthly
- Copy the Price ID

**Ultimate Plan:**
- Name: `Ultimate Plan`
- Description: `500 credits per month`
- Pricing: Recurring, £29.99, Monthly
- Copy the Price ID

3. Then insert the price IDs into Supabase:

Go to Supabase SQL Editor and run:

```sql
INSERT INTO public.stripe_price_mapping (plan_type, price_id, product_id, amount, currency)
VALUES 
  ('base', 'price_YOUR_BASE_PRICE_ID', 'prod_YOUR_BASE_PRODUCT_ID', 9.99, 'gbp'),
  ('essential', 'price_YOUR_ESSENTIAL_PRICE_ID', 'prod_YOUR_ESSENTIAL_PRODUCT_ID', 19.99, 'gbp'),
  ('ultimate', 'price_YOUR_ULTIMATE_PRICE_ID', 'prod_YOUR_ULTIMATE_PRODUCT_ID', 29.99, 'gbp')
ON CONFLICT (plan_type) DO UPDATE SET
  price_id = EXCLUDED.price_id,
  product_id = EXCLUDED.product_id;
```

Replace the `price_...` and `prod_...` values with your actual IDs from Stripe.

## Step 6: Test the Integration

1. Start your backend server:
```bash
cd server
npm start
```

2. Start your frontend (in a new terminal):
```bash
npm start
```

3. Go through the model creation flow:
   - Register/Login
   - Create a model
   - Generate images
   - Select an image
   - Choose a subscription plan
   - Complete payment

4. Use Stripe test card:
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

## Step 7: Set Up Webhooks (For Production)

### For Local Development (Testing)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```
4. Copy the webhook signing secret (starts with `whsec_...`)
5. Add to `server/.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### For Production

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret
6. Add to your production `server/.env`

## Troubleshooting

### "Price ID not found" error
- Make sure you ran the product creation script or manually created products
- Check that price IDs are in the `stripe_price_mapping` table in Supabase

### "User authentication required" error
- Make sure user is logged in
- Check Supabase auth is working

### Checkout not loading
- Verify `REACT_APP_STRIPE_PUBLISHABLE_KEY` is set correctly
- Check browser console for errors
- Make sure the key starts with `pk_test_` (or `pk_live_` for production)

### Webhook not working
- Verify webhook URL is correct
- Check webhook secret matches in `.env`
- Use Stripe Dashboard → Webhooks → View logs to debug

## Going Live

When ready for production:

1. Switch to **Live mode** in Stripe Dashboard
2. Get your live API keys (starts with `pk_live_` and `sk_live_`)
3. Update your `.env` files with live keys
4. Update `FRONTEND_URL` to your production domain
5. Set up production webhook endpoint
6. Test with a real card (use small amount first)

## Need Help?

- Stripe Docs: https://docs.stripe.com
- Stripe Dashboard: https://dashboard.stripe.com
- Check `STRIPE_SETUP.md` for more detailed information
