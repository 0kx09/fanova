/**
 * Script to create Stripe products and prices for subscription plans
 * Run with: node server/scripts/create-stripe-products.js
 */
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');

const PLANS = {
  base: {
    name: 'Base Plan',
    price: 9.99,
    currency: 'gbp',
    monthlyCredits: 50
  },
  essential: {
    name: 'Essential Plan',
    price: 19.99,
    currency: 'gbp',
    monthlyCredits: 250
  },
  ultimate: {
    name: 'Ultimate Plan',
    price: 29.99,
    currency: 'gbp',
    monthlyCredits: 500
  }
};

async function createProductsAndPrices() {
  try {
    console.log('Creating Stripe products and prices...\n');

    // Check if table exists (it should be created via SQL migration)
    const { error: tableCheckError } = await supabase
      .from('stripe_price_mapping')
      .select('*')
      .limit(1);

    if (tableCheckError) {
      console.error('⚠️  Error: stripe_price_mapping table not found!');
      console.error('Please run the SQL migration from server/supabase-stripe-schema.sql first.');
      console.error('Error:', tableCheckError.message);
      process.exit(1);
    }

    const priceMappings = [];

    for (const [planType, plan] of Object.entries(PLANS)) {
      console.log(`Creating ${plan.name}...`);

      // Create product
      const product = await stripe.products.create({
        name: plan.name,
        description: `${plan.monthlyCredits} credits per month`,
        metadata: {
          plan_type: planType,
          monthly_credits: plan.monthlyCredits.toString()
        }
      });

      console.log(`  Product created: ${product.id}`);

      // Create recurring price (monthly subscription)
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(plan.price * 100), // Convert to pence
        currency: plan.currency,
        recurring: {
          interval: 'month',
          interval_count: 1
        },
        metadata: {
          plan_type: planType
        }
      });

      console.log(`  Price created: ${price.id} (${plan.price} ${plan.currency.toUpperCase()}/month)`);
      console.log(`  Price ID: ${price.id}\n`);

      priceMappings.push({
        plan_type: planType,
        price_id: price.id,
        product_id: product.id,
        amount: plan.price,
        currency: plan.currency
      });
    }

    // Store price mappings in Supabase
    console.log('Storing price mappings in Supabase...');
    for (const mapping of priceMappings) {
      const { error } = await supabase
        .from('stripe_price_mapping')
        .upsert(mapping, { onConflict: 'price_id' });

      if (error) {
        console.error(`Error storing mapping for ${mapping.plan_type}:`, error);
      } else {
        console.log(`  ✓ Stored mapping for ${mapping.plan_type}`);
      }
    }

    console.log('\n✅ All products and prices created successfully!');
    console.log('\nPrice IDs:');
    priceMappings.forEach(m => {
      console.log(`  ${m.plan_type}: ${m.price_id}`);
    });

  } catch (error) {
    console.error('Error creating products:', error);
    process.exit(1);
  }
}

createProductsAndPrices();
