/**
 * Fix Essential Plan Price
 * Creates a price for the existing Essential product
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../config/supabase');

const ESSENTIAL_PRODUCT_ID = 'prod_TnByjTaF1Wg0vz'; // From previous output
const ESSENTIAL_PRICE = 19.99;
const ESSENTIAL_CREDITS = 250;

async function fixEssentialPrice() {
  console.log('═══════════════════════════════════════════════');
  console.log('  🔧 FIXING ESSENTIAL PLAN PRICE');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Create price for Essential product
    console.log(`Creating price for Essential plan...`);
    console.log(`Product ID: ${ESSENTIAL_PRODUCT_ID}`);
    console.log(`Price: $${ESSENTIAL_PRICE}/month`);
    console.log(`Credits: ${ESSENTIAL_CREDITS}\n`);

    const price = await stripe.prices.create({
      product: ESSENTIAL_PRODUCT_ID,
      unit_amount: Math.round(ESSENTIAL_PRICE * 100),
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_type: 'essential',
        monthly_credits: ESSENTIAL_CREDITS
      }
    });

    console.log('✅ Price created:', price.id);
    console.log(`   Amount: $${(price.unit_amount / 100).toFixed(2)}/month\n`);

    // Save to database
    console.log('💾 Saving to database...');

    const { error } = await supabase
      .from('stripe_price_mapping')
      .upsert({
        price_id: price.id,
        product_id: ESSENTIAL_PRODUCT_ID,
        plan_type: 'essential',
        amount: ESSENTIAL_PRICE,
        currency: 'usd',
        monthly_credits: ESSENTIAL_CREDITS
      }, {
        onConflict: 'price_id'
      });

    if (error) {
      console.error('⚠️  Database error:', error.message);
    } else {
      console.log('✅ Saved to database\n');
    }

    console.log('═══════════════════════════════════════════════');
    console.log('  ✅ ESSENTIAL PLAN FIXED');
    console.log('═══════════════════════════════════════════════\n');

    console.log('ESSENTIAL PLAN:');
    console.log(`  Product ID: ${ESSENTIAL_PRODUCT_ID}`);
    console.log(`  Price ID:   ${price.id}`);
    console.log(`  Amount:     $${ESSENTIAL_PRICE}/month`);
    console.log(`  Credits:    ${ESSENTIAL_CREDITS}\n`);

    console.log('Both plans are now ready! 🎉\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  }
}

fixEssentialPrice()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
