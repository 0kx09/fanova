/**
 * Stripe Product Verification Script
 * Lists all existing products and prices in your Stripe account
 *
 * Run with: node server/scripts/verify-stripe-products.js
 */

const path = require('path');

// Load .env from server directory (parent of scripts)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');

async function verifyProducts() {
  console.log('═══════════════════════════════════════════════');
  console.log('  🔍 STRIPE PRODUCT VERIFICATION');
  console.log('═══════════════════════════════════════════════\n');

  // Check Stripe API key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env file');
    process.exit(1);
  }

  const isTestMode = process.env.STRIPE_SECRET_KEY.includes('test');
  console.log(`🔑 Stripe Mode: ${isTestMode ? 'TEST' : 'PRODUCTION (LIVE)'}\n`);

  try {
    // List all products
    console.log('📦 Fetching products from Stripe...\n');
    const products = await stripe.products.list({ limit: 100, active: true });

    if (products.data.length === 0) {
      console.log('❌ No active products found in Stripe');
      console.log('\nRun the setup script to create products:');
      console.log('   node server/scripts/setup-stripe-products.js\n');
      return;
    }

    console.log(`✅ Found ${products.data.length} active product(s):\n`);

    for (const product of products.data) {
      console.log(`📦 ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Description: ${product.description || 'N/A'}`);

      if (product.metadata && Object.keys(product.metadata).length > 0) {
        console.log(`   Metadata:`);
        Object.entries(product.metadata).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
      }

      // List prices for this product
      const prices = await stripe.prices.list({ product: product.id, active: true });

      if (prices.data.length > 0) {
        console.log(`   Prices:`);
        prices.data.forEach(price => {
          const amount = (price.unit_amount / 100).toFixed(2);
          const interval = price.recurring?.interval || 'one-time';
          console.log(`     • ${price.id}: $${amount}/${interval}`);

          if (price.recurring?.trial_period_days) {
            console.log(`       Trial: ${price.recurring.trial_period_days} days`);
          }
        });
      }

      console.log('');
    }

    // Check database
    console.log('═══════════════════════════════════════════════');
    console.log('  💾 DATABASE CHECK');
    console.log('═══════════════════════════════════════════════\n');

    const { data: dbPrices, error } = await supabase
      .from('stripe_price_mapping')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Database error:', error.message);
    } else if (!dbPrices || dbPrices.length === 0) {
      console.log('⚠️  No price mappings found in database');
      console.log('   Run setup script to create and save price mappings\n');
    } else {
      console.log(`✅ Found ${dbPrices.length} price mapping(s) in database:\n`);

      dbPrices.forEach(mapping => {
        console.log(`${mapping.plan_type?.toUpperCase() || 'UNKNOWN'} PLAN:`);
        console.log(`  Price ID:   ${mapping.price_id}`);
        console.log(`  Product ID: ${mapping.product_id || 'N/A'}`);
        console.log(`  Amount:     $${mapping.amount}/${mapping.interval || 'month'}`);
        console.log(`  Credits:    ${mapping.monthly_credits || 'N/A'}`);
        console.log('');
      });
    }

    // Verify consistency
    console.log('═══════════════════════════════════════════════');
    console.log('  🔄 CONSISTENCY CHECK');
    console.log('═══════════════════════════════════════════════\n');

    if (dbPrices && dbPrices.length > 0) {
      let allValid = true;

      for (const mapping of dbPrices) {
        try {
          const price = await stripe.prices.retrieve(mapping.price_id);
          const product = await stripe.products.retrieve(price.product);

          if (!product.active) {
            console.log(`⚠️  ${mapping.plan_type}: Product is inactive in Stripe`);
            allValid = false;
          } else if (!price.active) {
            console.log(`⚠️  ${mapping.plan_type}: Price is inactive in Stripe`);
            allValid = false;
          } else {
            console.log(`✅ ${mapping.plan_type}: Valid and active`);
          }
        } catch (error) {
          console.log(`❌ ${mapping.plan_type}: Price not found in Stripe (${mapping.price_id})`);
          allValid = false;
        }
      }

      if (allValid) {
        console.log('\n🎉 All price mappings are valid and active!\n');
      } else {
        console.log('\n⚠️  Some issues detected. Consider running setup script.\n');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('   Check your STRIPE_SECRET_KEY in .env file\n');
    }
  }
}

// Run the verification
verifyProducts()
  .then(() => {
    console.log('✅ Verification complete\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  });
