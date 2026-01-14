/**
 * Create GBP Prices for Existing Products
 * Creates new GBP prices for Essential and Ultimate plans
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');

const PLANS = [
  {
    product_id: 'prod_TnByjTaF1Wg0vz', // Essential from previous creation
    plan_type: 'essential',
    price: 19.99,
    credits: 250
  },
  {
    product_id: 'prod_TnByfhD0CzYfBx', // Ultimate from previous creation
    plan_type: 'ultimate',
    price: 29.99,
    credits: 500,
    trial_days: 1
  }
];

async function createGBPPrices() {
  console.log('═══════════════════════════════════════════════');
  console.log('  💷 CREATING GBP PRICES');
  console.log('═══════════════════════════════════════════════\n');

  const createdPrices = [];

  for (const plan of PLANS) {
    try {
      console.log(`📦 Creating GBP price for ${plan.plan_type} plan`);
      console.log(`   Product ID: ${plan.product_id}`);
      console.log(`   Price: £${plan.price}/month`);
      console.log(`   Credits: ${plan.credits}`);
      if (plan.trial_days) {
        console.log(`   Trial: ${plan.trial_days} day`);
      }

      const priceData = {
        product: plan.product_id,
        unit_amount: Math.round(plan.price * 100), // Convert to pence
        currency: 'gbp',
        recurring: {
          interval: 'month'
        },
        metadata: {
          plan_type: plan.plan_type,
          monthly_credits: plan.credits
        }
      };

      // Add trial for Ultimate plan
      if (plan.trial_days) {
        priceData.recurring.trial_period_days = plan.trial_days;
      }

      const price = await stripe.prices.create(priceData);

      console.log(`   ✅ Price created: ${price.id}`);
      console.log(`   💰 Amount: £${(price.unit_amount / 100).toFixed(2)}/month\n`);

      // Save to database
      console.log(`   💾 Saving to database...`);

      const { error } = await supabase
        .from('stripe_price_mapping')
        .upsert({
          price_id: price.id,
          product_id: plan.product_id,
          plan_type: plan.plan_type,
          amount: plan.price,
          currency: 'gbp',
          monthly_credits: plan.credits
        }, {
          onConflict: 'price_id'
        });

      if (error) {
        console.error(`   ⚠️  Database error:`, error.message);
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
      console.error(`   ❌ Error creating ${plan.plan_type} price:`, error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════');
  console.log('  ✅ GBP PRICES CREATED');
  console.log('═══════════════════════════════════════════════\n');

  if (createdPrices.length > 0) {
    console.log('📋 Created GBP Prices Summary:\n');

    createdPrices.forEach(p => {
      console.log(`${p.plan_type.toUpperCase()} PLAN:`);
      console.log(`  Product ID: ${p.product_id}`);
      console.log(`  Price ID:   ${p.price_id}`);
      console.log(`  Amount:     £${p.amount}/month`);
      console.log(`  Credits:    ${p.credits}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════');
    console.log('  NEXT STEPS');
    console.log('═══════════════════════════════════════════════\n');
    console.log('1. Test checkout flow with GBP prices');
    console.log('2. Verify prices appear correctly in your app');
    console.log('3. You can archive the old USD prices in Stripe Dashboard\n');

    console.log('🎉 All GBP prices are ready!\n');
  }
}

createGBPPrices()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
