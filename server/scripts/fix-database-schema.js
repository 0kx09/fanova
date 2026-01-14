/**
 * Fix Database Schema for stripe_price_mapping
 * Adds missing monthly_credits column and updates existing data
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = require('../config/supabase');

async function fixDatabaseSchema() {
  console.log('═══════════════════════════════════════════════');
  console.log('  🔧 FIXING DATABASE SCHEMA');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Check current table structure
    console.log('📋 Checking current table structure...\n');

    const { data: currentData, error: selectError } = await supabase
      .from('stripe_price_mapping')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('❌ Error reading table:', selectError.message);
      return;
    }

    console.log('Current columns:', currentData && currentData.length > 0 ? Object.keys(currentData[0]).join(', ') : 'Table is empty');
    console.log('');

    // Add monthly_credits column if missing
    console.log('Adding monthly_credits column...');

    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE stripe_price_mapping
        ADD COLUMN IF NOT EXISTS monthly_credits INTEGER;
      `
    });

    if (addColumnError) {
      console.log('Note: RPC method not available, column may already exist or need manual creation');
      console.log('Run this SQL manually in Supabase SQL Editor:\n');
      console.log('ALTER TABLE stripe_price_mapping ADD COLUMN IF NOT EXISTS monthly_credits INTEGER;\n');
    } else {
      console.log('✅ Column added successfully\n');
    }

    // Update existing records with correct monthly_credits
    console.log('Updating existing price records...\n');

    // Update Essential plan
    const { error: essentialError } = await supabase
      .from('stripe_price_mapping')
      .update({ monthly_credits: 250 })
      .eq('plan_type', 'essential');

    if (essentialError) {
      console.error('⚠️  Error updating Essential plan:', essentialError.message);
    } else {
      console.log('✅ Essential plan updated (250 credits)');
    }

    // Update Ultimate plan
    const { error: ultimateError } = await supabase
      .from('stripe_price_mapping')
      .update({ monthly_credits: 500 })
      .eq('plan_type', 'ultimate');

    if (ultimateError) {
      console.error('⚠️  Error updating Ultimate plan:', ultimateError.message);
    } else {
      console.log('✅ Ultimate plan updated (500 credits)');
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ DATABASE SCHEMA FIXED');
    console.log('═══════════════════════════════════════════════\n');

    // Show final state
    console.log('Final stripe_price_mapping table:\n');

    const { data: finalData, error: finalError } = await supabase
      .from('stripe_price_mapping')
      .select('*');

    if (!finalError && finalData) {
      finalData.forEach(row => {
        console.log(`${(row.plan_type || 'unknown').toUpperCase()}:`);
        console.log(`  Price ID: ${row.price_id}`);
        console.log(`  Amount: $${row.amount || 'N/A'}`);
        console.log(`  Credits: ${row.monthly_credits || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

fixDatabaseSchema()
  .then(() => {
    console.log('✅ Schema fix complete!\n');
    console.log('If you see RPC errors, run this SQL manually in Supabase:\n');
    console.log('ALTER TABLE stripe_price_mapping ADD COLUMN IF NOT EXISTS monthly_credits INTEGER;\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
