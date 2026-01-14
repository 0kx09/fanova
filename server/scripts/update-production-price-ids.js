/**
 * Script to update production Stripe price IDs in database
 * This script fetches all products/prices from Stripe (production mode) and updates the database
 * Run with: node server/scripts/update-production-price-ids.js
 * 
 * Make sure STRIPE_SECRET_KEY is set to your LIVE key (sk_live_...)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');

// Expected plan names in Stripe (should match your product names)
const PLAN_NAMES = {
  base: ['Base Plan', 'base plan', 'base'],
  essential: ['Essential Plan', 'essential plan', 'essential'],
  ultimate: ['Ultimate Plan', 'ultimate plan', 'ultimate']
};

async function updateProductionPriceIds() {
  try {
    console.log('🔍 Fetching products and prices from Stripe (Production Mode)...\n');

    // Check if we're using live keys
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
      console.error('❌ ERROR: You must use a LIVE Stripe secret key (sk_live_...)');
      console.error('   Current key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 8) || 'NOT SET');
      console.error('\n   Please set STRIPE_SECRET_KEY=sk_live_... in your .env file');
      process.exit(1);
    }

    // Check if table exists
    const { error: tableCheckError } = await supabase
      .from('stripe_price_mapping')
      .select('*')
      .limit(1);

    if (tableCheckError) {
      console.error('❌ Error: stripe_price_mapping table not found!');
      console.error('Error:', tableCheckError.message);
      process.exit(1);
    }

    // Fetch all active products from Stripe
    console.log('📦 Fetching products from Stripe...');
    const products = await stripe.products.list({ active: true, limit: 100 });
    
    if (products.data.length === 0) {
      console.error('❌ No products found in Stripe. Please create products first.');
      process.exit(1);
    }

    console.log(`   Found ${products.data.length} product(s)\n`);

    // Map products to plan types
    const planMappings = {};
    
    for (const product of products.data) {
      // Try to match product name to plan type
      let planType = null;
      const productNameLower = product.name.toLowerCase();
      
      for (const [type, names] of Object.entries(PLAN_NAMES)) {
        if (names.some(name => productNameLower.includes(name.toLowerCase()))) {
          planType = type;
          break;
        }
      }

      // Also check metadata
      if (!planType && product.metadata && product.metadata.plan_type) {
        planType = product.metadata.plan_type;
      }

      if (!planType) {
        console.log(`⚠️  Could not determine plan type for product: "${product.name}" (${product.id})`);
        console.log('   Skipping...\n');
        continue;
      }

      // Fetch prices for this product
      console.log(`🔍 Processing ${product.name} (${planType})...`);
      const prices = await stripe.prices.list({ 
        product: product.id, 
        active: true,
        type: 'recurring'
      });

      if (prices.data.length === 0) {
        console.log(`   ⚠️  No recurring prices found for ${product.name}`);
        continue;
      }

      // Get the monthly price (if multiple, prefer monthly)
      const monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month') || prices.data[0];
      
      planMappings[planType] = {
        product_id: product.id,
        price_id: monthlyPrice.id,
        product_name: product.name,
        amount: monthlyPrice.unit_amount / 100,
        currency: monthlyPrice.currency,
        interval: monthlyPrice.recurring?.interval || 'month'
      };

      console.log(`   ✓ Price ID: ${monthlyPrice.id}`);
      console.log(`   ✓ Amount: ${monthlyPrice.currency.toUpperCase()} ${planMappings[planType].amount}/${planMappings[planType].interval}\n`);
    }

    // Check if we found all required plans
    const requiredPlans = ['base', 'essential', 'ultimate'];
    const missingPlans = requiredPlans.filter(plan => !planMappings[plan]);

    
    if (missingPlans.length > 0) {
      console.error('❌ Missing required plans:', missingPlans.join(', '));
      console.error('   Please ensure all three plans exist in Stripe with matching names.\n');
      process.exit(1);
    }

    // Update database
    console.log('💾 Updating database with production price IDs...\n');
    
    for (const [planType, mapping] of Object.entries(planMappings)) {
      const { error } = await supabase
        .from('stripe_price_mapping')
        .upsert({
          plan_type: planType,
          price_id: mapping.price_id,
          product_id: mapping.product_id,
          amount: mapping.amount,
          currency: mapping.currency
        }, { 
          onConflict: 'plan_type'
        });

      if (error) {
        console.error(`   ❌ Error updating ${planType}:`, error.message);
      } else {
        console.log(`   ✅ Updated ${planType}: ${mapping.price_id}`);
      }
    }

    console.log('\n✅ Successfully updated all production price IDs!\n');
    console.log('📋 Summary:');
    for (const [planType, mapping] of Object.entries(planMappings)) {
      console.log(`   ${planType.padEnd(10)} → ${mapping.price_id} (${mapping.product_name})`);
    }
    console.log('\n💡 Make sure your frontend .env has REACT_APP_STRIPE_PUBLISHABLE_KEY set to your LIVE key (pk_live_...)');

  } catch (error) {
    console.error('❌ Error updating price IDs:', error);
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n⚠️  Authentication failed. Make sure STRIPE_SECRET_KEY is correct.');
    }
    process.exit(1);
  }
}

updateProductionPriceIds();
