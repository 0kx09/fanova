/**
 * Stripe Product Setup Script
 * Creates products and prices for Fanova subscription plans
 *
 * Run with: node server/scripts/setup-stripe-products.js
 */

const path = require('path');

// Load .env from server directory (parent of scripts)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');

// Product definitions
const PRODUCTS = [
  {
    name: 'Fanova Essential',
    description: 'Perfect for regular creators. Generate up to 250 images per month.',
    plan_type: 'essential',
    price: 19.99,
    currency: 'gbp',
    credits: 250,
    features: [
      '250 monthly credits',
      'High-quality AI generation',
      'Unlimited models',
      'Chat generation',
      'Priority support'
    ]
  },
  {
    name: 'Fanova Ultimate',
    description: 'For power users. Generate up to 500 images per month with NSFW access.',
    plan_type: 'ultimate',
    price: 29.99,
    currency: 'gbp',
    credits: 500,
    trial_days: 1,
    features: [
      '500 monthly credits',
      'NSFW content generation',
      'High-quality AI generation',
      'Unlimited models',
      'Chat generation',
      'Priority support',
      '1-day free trial'
    ]
  }
];

async function createProducts() {
  console.log('═══════════════════════════════════════════════');
  console.log('  🚀 FANOVA STRIPE PRODUCT SETUP');
  console.log('═══════════════════════════════════════════════\n');

  // Check Stripe API key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env file');
    process.exit(1);
  }

  if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    console.error('❌ STRIPE_SECRET_KEY format is invalid (should start with "sk_")');
    process.exit(1);
  }

  const isTestMode = process.env.STRIPE_SECRET_KEY.includes('test');
  console.log(`🔑 Stripe Mode: ${isTestMode ? 'TEST' : 'PRODUCTION (LIVE)'}`);
  console.log(`📊 Creating ${PRODUCTS.length} products...\n`);

  const createdProducts = [];

  for (const productDef of PRODUCTS) {
    try {
      console.log(`\n📦 Creating product: ${productDef.name}`);
      console.log(`   Plan Type: ${productDef.plan_type}`);
      console.log(`   Price: $${productDef.price}/month`);
      console.log(`   Credits: ${productDef.credits}`);
      if (productDef.trial_days) {
        console.log(`   Trial: ${productDef.trial_days} day${productDef.trial_days > 1 ? 's' : ''}`);
      }

      // Create product
      const product = await stripe.products.create({
        name: productDef.name,
        description: productDef.description,
        metadata: {
          plan_type: productDef.plan_type,
          monthly_credits: productDef.credits,
          features: productDef.features.join('|')
        }
      });

      console.log(`   ✅ Product created: ${product.id}`);

      // Create price
      const priceData = {
        product: product.id,
        unit_amount: Math.round(productDef.price * 100), // Convert to cents/pence
        currency: productDef.currency || 'gbp',
        recurring: {
          interval: 'month'
        },
        metadata: {
          plan_type: productDef.plan_type,
          monthly_credits: productDef.credits
        }
      };

      // Only add trial_period_days if it exists
      if (productDef.trial_days) {
        priceData.recurring.trial_period_days = productDef.trial_days;
      }

      const price = await stripe.prices.create(priceData);

      console.log(`   ✅ Price created: ${price.id}`);
      const currencySymbol = (productDef.currency || 'gbp').toUpperCase() === 'GBP' ? '£' : '$';
      console.log(`   💰 Amount: ${currencySymbol}${(price.unit_amount / 100).toFixed(2)}/month`);

      // Save to database
      console.log(`   💾 Saving to database...`);

      const { data, error } = await supabase
        .from('stripe_price_mapping')
        .upsert({
          price_id: price.id,
          product_id: product.id,
          plan_type: productDef.plan_type,
          amount: productDef.price,
          currency: productDef.currency || 'gbp',
          monthly_credits: productDef.credits
        }, {
          onConflict: 'price_id'
        });

      if (error) {
        console.error(`   ⚠️  Database error (non-fatal):`, error.message);
      } else {
        console.log(`   ✅ Saved to database`);
      }

      createdProducts.push({
        plan_type: productDef.plan_type,
        product_id: product.id,
        price_id: price.id,
        amount: productDef.price,
        currency: productDef.currency || 'gbp',
        credits: productDef.credits
      });

    } catch (error) {
      console.error(`   ❌ Error creating ${productDef.name}:`, error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅ SETUP COMPLETE');
  console.log('═══════════════════════════════════════════════\n');

  if (createdProducts.length > 0) {
    console.log('📋 Created Products Summary:\n');

    createdProducts.forEach(p => {
      const currencySymbol = (p.currency || 'gbp').toUpperCase() === 'GBP' ? '£' : '$';
      console.log(`${p.plan_type.toUpperCase()} PLAN:`);
      console.log(`  Product ID: ${p.product_id}`);
      console.log(`  Price ID:   ${p.price_id}`);
      console.log(`  Amount:     ${currencySymbol}${p.amount}/month`);
      console.log(`  Credits:    ${p.credits}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════');
    console.log('  NEXT STEPS');
    console.log('═══════════════════════════════════════════════\n');
    console.log('1. Update your frontend with these price IDs');
    console.log('2. Test checkout flow in Stripe Dashboard');
    console.log('3. Verify prices appear correctly in your app\n');

    if (isTestMode) {
      console.log('⚠️  NOTE: These are TEST mode products.');
      console.log('   Run again with production keys when ready.\n');
    } else {
      console.log('🎉 PRODUCTION products created!');
      console.log('   Your Stripe subscription is now live.\n');
    }

    // Generate frontend code snippet
    console.log('═══════════════════════════════════════════════');
    console.log('  FRONTEND CODE SNIPPET');
    console.log('═══════════════════════════════════════════════\n');
    console.log('Add this to your frontend pricing service:\n');
    console.log('const STRIPE_PRICES = {');
    createdProducts.forEach(p => {
      console.log(`  ${p.plan_type}: '${p.price_id}',`);
    });
    console.log('};\n');
  } else {
    console.log('❌ No products were created. Check errors above.\n');
  }
}

// Run the setup
createProducts()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
