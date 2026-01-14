/**
 * Quick Email Test Script
 * Run with: node test-email.js
 */

const API_URL = 'https://usefanova.com/api';

// CHANGE THIS TO YOUR EMAIL
const TEST_EMAIL = 'your@email.com';

async function testConfig() {
  console.log('\n🔍 Checking Resend configuration...\n');

  try {
    const response = await fetch(`${API_URL}/test-email/config`);
    const data = await response.json();

    console.log('Configuration Status:', data.configured ? '✅ Configured' : '❌ Not Configured');
    console.log('API Key Prefix:', data.apiKeyPrefix);
    console.log('Frontend URL:', data.frontendUrl);
    console.log('');

    return data.configured;
  } catch (error) {
    console.error('❌ Error checking config:', error.message);
    console.error('   Make sure the server is running on port 5000\n');
    return false;
  }
}

async function sendTestEmail(type) {
  console.log(`📧 Sending ${type} email to: ${TEST_EMAIL}\n`);

  try {
    const response = await fetch(`${API_URL}/test-email/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: TEST_EMAIL })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ SUCCESS:', data.message);
      console.log('   Email sent to:', TEST_EMAIL);
      console.log('   Check your inbox (and spam folder)!\n');
      if (data.data) {
        console.log('Response data:', JSON.stringify(data.data, null, 2));
      }
    } else {
      console.log('❌ FAILED:', data.message || 'Unknown error');
      if (data.error) {
        console.log('Error details:', JSON.stringify(data.error, null, 2));
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('   Make sure the server is running on port 5000\n');
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('  📧 FANOVA EMAIL TEST SUITE');
  console.log('═══════════════════════════════════════════════');

  // Check configuration
  const isConfigured = await testConfig();

  if (!isConfigured) {
    console.log('⚠️  Resend is not configured properly. Please check your .env file.\n');
    return;
  }

  console.log('═══════════════════════════════════════════════');
  console.log('  Testing email sending...');
  console.log('═══════════════════════════════════════════════\n');

  // Test welcome email
  await sendTestEmail('welcome');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test first model email
  await sendTestEmail('first-model');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test subscription email
  await sendTestEmail('subscription');

  console.log('═══════════════════════════════════════════════');
  console.log('  Test complete!');
  console.log('═══════════════════════════════════════════════\n');
  console.log('📬 Check your email inbox (and spam folder) for:');
  console.log('   • Welcome email');
  console.log('   • First model congratulations email');
  console.log('   • Subscription confirmation email\n');
  console.log('⚠️  Note: If you see errors about "Domain not found" or');
  console.log('   "Email can only be sent to [...]", you need to verify');
  console.log('   your domain in the Resend dashboard:\n');
  console.log('   https://resend.com/domains\n');
}

// Run the tests
runTests().catch(console.error);
