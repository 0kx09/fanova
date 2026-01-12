/**
 * Script to create a NEW Ultimate Plan product and price in Stripe
 * This creates a fresh product/price that can be used with the 1-day free trial
 * Run with: node server/scripts/create-ultimate-plan-with-trial.js
 */
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');

async function createUltimatePlanWithTrial() {
  try {
    console.log('Creating NEW Ultimate Plan product and price for 1-day free trial...\n');

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
      process.exit(1);
    }

    // Check if table exists
    const { error: tableCheckError } = await supabase
      .from('stripe_price_mapping')
      .select('*')
      .limit(1);

    if (tableCheckError) {
      console.error('⚠️  Error: stripe_price_mapping table not found!');
      console.error('Please run the SQL migration from server/supabase-stripe-schema.sql first.');
      process.exit(1);
    }

    // Get current Ultimate plan mapping to see what we're replacing
    const { data: currentMapping } = await supabase
      .from('stripe_price_mapping')
      .select('*')
      .eq('plan_type', 'ultimate')
      .single();

    if (currentMapping) {
      console.log('Current Ultimate plan mapping:');
      console.log(`  Price ID: ${currentMapping.price_id}`);
      console.log(`  Product ID: ${currentMapping.product_id}`);
      console.log(`  Amount: £${currentMapping.amount}\n`);
      console.log('⚠️  This will create a NEW product/price. The old one will remain in Stripe but won\'t be used.\n');
    }

    // Create NEW product for Ultimate Plan
    console.log('Creating new Ultimate Plan product...');
    const product = await stripe.products.create({
      name: 'Ultimate Plan',
      description: '500 credits per month with 1-day free trial',
      metadata: {
        plan_type: 'ultimate',
        monthly_credits: '500',
        has_trial: 'true',
        trial_days: '1'
      }
    });

    console.log(`  ✓ Product created: ${product.id}\n`);

    // Create NEW recurring price (monthly subscription)
    // Note: Trial period is set in checkout session, not in the price itself
    console.log('Creating new Ultimate Plan price...');
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(29.99 * 100), // £29.99 in pence
      currency: 'gbp',
      recurring: {
        interval: 'month',
        interval_count: 1
      },
      metadata: {
        plan_type: 'ultimate',
        has_trial: 'true',
        trial_days: '1'
      }
    });

    console.log(`  ✓ Price created: ${price.id} (£29.99 GBP/month)`);
    console.log(`  ✓ Price ID: ${price.id}\n`);

    // Update the price mapping in Supabase
    console.log('Updating price mapping in Supabase...');
    const { error: updateError } = await supabase
      .from('stripe_price_mapping')
      .upsert({
        plan_type: 'ultimate',
        price_id: price.id,
        product_id: product.id,
        amount: 29.99,
        currency: 'gbp'
      }, { 
        onConflict: 'plan_type',
        ignoreDuplicates: false 
      });

    if (updateError) {
      console.error('❌ Error updating price mapping:', updateError);
      process.exit(1);
    }

    console.log('  ✓ Price mapping updated in Supabase\n');

    console.log('✅ NEW Ultimate Plan product and price created successfully!');
    console.log('\n📋 Summary:');
    console.log(`  Product ID: ${product.id}`);
    console.log(`  Price ID: ${price.id}`);
    console.log(`  Amount: £29.99/month`);
    console.log(`  Trial: 1 day (set in checkout session)`);
    console.log('\n💡 The trial period will be applied when creating checkout sessions.');
    console.log('   The backend code already handles this in server/routes/stripe.js\n');

    if (currentMapping && currentMapping.price_id !== price.id) {
      console.log('⚠️  Note: Old price ID is still in Stripe:');
      console.log(`   ${currentMapping.price_id}`);
      console.log('   You can archive it in Stripe Dashboard if desired.\n');
    }

  } catch (error) {
    console.error('❌ Error creating Ultimate plan:', error);
    if (error.response) {
      console.error('Stripe API Error:', error.response.data);
    }
    process.exit(1);
  }
}

createUltimatePlanWithTrial();
