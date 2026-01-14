/**
 * Test script to send a single apology email to yourself
 * Usage: node server/scripts/test-apology-email.js your-email@example.com
 *
 * This allows you to preview the email before sending to real customers
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sendAccountDeletionApologyEmail } = require('../services/emailService');

// Get email from command line argument
const testEmail = process.argv[2];
const testName = process.argv[3] || 'Test User';

/**
 * Send a test email
 */
async function sendTestEmail() {
  console.log('═══════════════════════════════════════════════');
  console.log('  📧 SENDING TEST APOLOGY EMAIL');
  console.log('═══════════════════════════════════════════════\n');

  if (!testEmail) {
    console.error('❌ Error: No email address provided\n');
    console.log('Usage:');
    console.log('  node server/scripts/test-apology-email.js <email> [name]\n');
    console.log('Examples:');
    console.log('  node server/scripts/test-apology-email.js myemail@example.com');
    console.log('  node server/scripts/test-apology-email.js myemail@example.com "John Doe"\n');
    process.exit(1);
  }

  // Validate email format
  if (!testEmail.includes('@')) {
    console.error('❌ Error: Invalid email format\n');
    console.log('Please provide a valid email address like: user@example.com\n');
    process.exit(1);
  }

  console.log(`📤 Sending test email to: ${testEmail}`);
  console.log(`👤 Name: ${testName}\n`);

  try {
    const result = await sendAccountDeletionApologyEmail(testEmail, testName);

    if (result.success) {
      console.log('✅ Test email sent successfully!\n');
      console.log('═══════════════════════════════════════════════');
      console.log('  📬 CHECK YOUR INBOX');
      console.log('═══════════════════════════════════════════════\n');
      console.log('1. Check your email inbox for:', testEmail);
      console.log('2. Look for subject: "Important: Account Update Required - Fanova"');
      console.log('3. Verify the email looks professional and clear');
      console.log('4. Test all links work correctly');
      console.log('5. If everything looks good, you can send to real customers\n');

      if (result.data?.id) {
        console.log(`Email ID: ${result.data.id}\n`);
      }
    } else {
      console.log('❌ Failed to send test email\n');
      console.error('Error details:', result.error);
      console.log('\nCommon issues:');
      console.log('1. Check that RESEND_API_KEY is set in your .env file');
      console.log('2. Verify the API key is valid and starts with "re_"');
      console.log('3. Ensure your domain is verified in Resend');
      console.log('4. Check that you have sufficient email quota\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Exception occurred:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the test
sendTestEmail()
  .then(() => {
    console.log('═══════════════════════════════════════════════');
    console.log('  ✨ TEST COMPLETE');
    console.log('═══════════════════════════════════════════════\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
