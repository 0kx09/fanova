# Stripe Integration Setup Guide

This guide will help you set up Stripe payment integration for Fanova subscription plans.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Stripe API keys (from Stripe Dashboard)
3. Supabase database access

## Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_`)
3. Copy your **Secret key** (starts with `sk_`)
4. For webhooks, you'll also need a webhook secret (we'll set this up later)

## Step 2: Add Environment Variables

### Backend (.env in `server/` directory)

Add the following to your `server/.env` file:

```env
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_... (get this after setting up webhook)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env in root directory)

Create a `.env` file in the root directory (if it doesn't exist) and add:

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)
REACT_APP_API_URL=http://localhost:5000/api
```

## Step 3: Run Supabase Schema Migration

1. Go to your Supabase Dashboard → SQL Editor
2. Run the SQL from `server/supabase-stripe-schema.sql`
3. This creates:
   - `stripe_price_mapping` table
   - Adds `stripe_customer_id` and `stripe_subscription_id` columns to `profiles` table

## Step 4: Create Stripe Products and Prices

Run the script to create products and prices in Stripe:

```bash
cd server
node scripts/create-stripe-products.js
```

This will:
- Create 3 products (Base Plan, Essential Plan, Ultimate Plan)
- Create monthly recurring prices for each
- Store the price IDs in Supabase `stripe_price_mapping` table

**Note:** Make sure your `STRIPE_SECRET_KEY` is set in `server/.env` before running this script.

## Step 5: Set Up Stripe Webhook (for production)

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Add it to your `server/.env` as `STRIPE_WEBHOOK_SECRET`

### For Local Development

Use Stripe CLI to forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

This will give you a webhook secret. Add it to `server/.env` as `STRIPE_WEBHOOK_SECRET`.

## Step 6: Test the Integration

1. Start your backend server: `cd server && npm start`
2. Start your frontend: `npm start`
3. Go through the model creation flow
4. After generating images, select one and choose a plan
5. Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
   - Any ZIP code

## Flow Overview

1. User creates model and generates images
2. User selects an image
3. User chooses a subscription plan
4. Stripe Embedded Checkout is displayed
5. User completes payment
6. Webhook handles subscription activation
7. User is redirected to dashboard with their model

## Troubleshooting

### "Price ID not found" error
- Make sure you ran the `create-stripe-products.js` script
- Check that price IDs are stored in `stripe_price_mapping` table

### "User authentication required" error
- Make sure user is logged in
- Check that Supabase auth is working correctly

### Webhook not working
- Verify webhook URL is correct
- Check webhook secret matches in `.env`
- Use Stripe Dashboard → Webhooks → View logs to debug

### Checkout not loading
- Verify `REACT_APP_STRIPE_PUBLISHABLE_KEY` is set correctly
- Check browser console for errors
- Ensure Stripe publishable key starts with `pk_`

## Production Checklist

- [ ] Switch to live mode API keys
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Set up production webhook endpoint
- [ ] Test complete flow with real card (use Stripe test mode first)
- [ ] Verify webhook events are being received
- [ ] Test subscription cancellation and updates
