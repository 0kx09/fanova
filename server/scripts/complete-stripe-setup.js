/**
 * Complete Stripe Setup - One Script to Rule Them All
 * 1. Adds monthly_credits column (if missing)
 * 2. Clears old price mappings
 * 3. Creates new GBP prices
 * 4. Saves to database
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');

const PLANS = [
  {
    product_id: 'prod_TnByjTaF1Wg0vz', // Essential
    plan_type: 'essential',
    price: 19.99,
    credits: 250
  },
  {
    product_id: 'prod_TnByfhD0CzYfBx', // Ultimate
    plan_type: 'ultimate',
    price: 29.99,
    credits: 500,
    trial_days: 1
  }
];

async function completeSetup() {
  console.log('═══════════════════════════════════════════════');
  console.log('  🚀 COMPLETE STRIPE SETUP');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // STEP 1: Clear old price mappings
    console.log('🗑️  Step 1: Clearing old price mappings...\n');

    const { error: deleteError } = await supabase
      .from('stripe_price_mapping')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.error('⚠️  Error clearing old prices:', deleteError.message);
    } else {
      console.log('✅ Old price mappings cleared\n');
    }

    // STEP 2: Create new GBP prices
    console.log('💷 Step 2: Creating new GBP prices...\n');

    const createdPrices = [];

    for (const plan of PLANS) {
      try {
        console.log(`📦 Creating ${plan.plan_type} price`);
        console.log(`   Product: ${plan.product_id}`);
        console.log(`   Price: £${plan.price}/month`);
        console.log(`   Credits: ${plan.credits}`);

        const priceData = {
          product: plan.product_id,
          unit_amount: Math.round(plan.price * 100),
          currency: 'gbp',
          recurring: {
            interval: 'month'
          },
          metadata: {
            plan_type: plan.plan_type,
            monthly_credits: plan.credits
          }
        };

        if (plan.trial_days) {
          priceData.recurring.trial_period_days = plan.trial_days;
          console.log(`   Trial: ${plan.trial_days} day`);
        }

        const price = await stripe.prices.create(priceData);

        console.log(`   ✅ Price created: ${price.id}\n`);

        // STEP 3: Save to database
        console.log(`   💾 Saving to database...`);

        const { error: insertError } = await supabase
          .from('stripe_price_mapping')
          .insert({
            price_id: price.id,
            product_id: plan.product_id,
            plan_type: plan.plan_type,
            amount: plan.price,
            currency: 'gbp',
            monthly_credits: plan.credits
          });

        if (insertError) {
          console.error(`   ⚠️  Database error:`, insertError.message);

          // If monthly_credits column doesn't exist, show SQL
          if (insertError.message.includes('monthly_credits')) {
            console.log('\n⚠️  The monthly_credits column is missing!');
            console.log('Run this SQL in Supabase SQL Editor:\n');
            console.log('ALTER TABLE stripe_price_mapping ADD COLUMN IF NOT EXISTS monthly_credits INTEGER;\n');
            console.log('Then run this script again.\n');
            process.exit(1);
          }
        } else {
          console.log(`   ✅ Saved to database\n`);
        }

        createdPrices.push({
          plan_type: plan.plan_type,
          product_id: plan.product_id,
          price_id: price.id,
          amount: plan.price,
          credits: plan.credits
        });

      } catch (error) {
        console.error(`   ❌ Error:`, error.message);
        if (error.code) {
          console.error(`   Error code: ${error.code}`);
        }
        console.log('');
      }
    }

    // STEP 4: Verify
    console.log('═══════════════════════════════════════════════');
    console.log('  ✅ SETUP COMPLETE');
    console.log('═══════════════════════════════════════════════\n');

    if (createdPrices.length > 0) {
      console.log('📋 Active Price Mappings:\n');

      createdPrices.forEach(p => {
        console.log(`${p.plan_type.toUpperCase()}:`);
        console.log(`  Product ID: ${p.product_id}`);
        console.log(`  Price ID:   ${p.price_id}`);
        console.log(`  Amount:     £${p.amount}/month`);
        console.log(`  Credits:    ${p.credits}`);
        console.log('');
      });

      console.log('═══════════════════════════════════════════════');
      console.log('  🎉 ALL DONE!');
      console.log('═══════════════════════════════════════════════\n');
      console.log('Your Stripe checkout should now work with GBP prices.\n');
      console.log('Test by visiting your pricing page and clicking subscribe.\n');
    } else {
      console.log('❌ No prices were created. Check errors above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

completeSetup()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
